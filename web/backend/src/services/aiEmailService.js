import { GoogleGenAI, Type } from "@google/genai";
import Contest from "../models/Contest.js";
import Team from "../models/Team.js";
import Submission from "../models/Submission.js";
import { sendCustomEmail } from "./emailService.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3-flash-preview";
const GENERATION_TIMEOUT_MS = 25000;

const TEMPLATE_INFO = {
  finalist: {
    label: "Finalist Notification",
    intent: "Chúc mừng đội thi đã lọt vào vòng chung kết / vòng tiếp theo của cuộc thi.",
  },
  deadline: {
    label: "Deadline Reminder",
    intent: "Nhắc nhở đội thi về hạn nộp bài sắp tới, thúc giục hoàn thành đúng hạn.",
  },
  missing_submission: {
    label: "Missing Submission Alert",
    intent: "Cảnh báo đội thi rằng hệ thống ghi nhận họ CHƯA nộp bài, cần nộp gấp để tránh bị loại khỏi cuộc thi.",
  },
  mentor_assignment: {
    label: "Mentor Assignment",
    intent: "Thông báo đội thi đã được phân công mentor hỗ trợ, khuyến khích họ chủ động liên hệ mentor.",
  },
};

const generateWithTimeout = (params) =>
  Promise.race([
    ai.models.generateContent(params),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Trợ lý AI phản hồi quá lâu, vui lòng thử lại.")), GENERATION_TIMEOUT_MS)
    ),
  ]);

const resolveRecipients = async ({ contest, scope, pool_id, team_id }) => {
  let teams = [];

  if (scope === "team" && team_id) {
    const t = await Team.findById(team_id).populate("leader_id", "full_name email");
    if (t) teams = [t];
  } else if (scope === "pool" && pool_id) {
    teams = await Team.find({ contest_id: contest._id, pool_id }).populate("leader_id", "full_name email");
  } else if (scope === "missing_submission") {
    const activeRound = (contest.rounds || []).find((r) => r.is_active);
    if (activeRound) {
      const eligible = await Team.find({
        contest_id: contest._id,
        status: { $in: ["ACTIVE", "CONFIRMED"] },
      }).populate("leader_id", "full_name email");
      const submissions = await Submission.find({ round_id: activeRound._id }).select("team_id");
      const submittedIds = new Set(submissions.map((s) => s.team_id.toString()));
      teams = eligible.filter((t) => !submittedIds.has(t._id.toString()));
    }
  } else {
    teams = await Team.find({ contest_id: contest._id }).populate("leader_id", "full_name email");
  }

  return teams
    .filter((t) => t.leader_id?.email)
    .map((t) => ({
      team_id: t._id.toString(),
      team_name: t.team_name,
      leader_name: t.leader_id.full_name || "bạn",
      leader_email: t.leader_id.email,
    }));
};

export const generateEmailDraft = async ({ contest_id, template, scope, pool_id, team_id, custom_notes }) => {
  const contest = await Contest.findById(contest_id);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }

  const templateInfo = TEMPLATE_INFO[template];
  if (!templateInfo) {
    const err = new Error("Loại email không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const recipients = await resolveRecipients({ contest, scope, pool_id, team_id });
  if (recipients.length === 0) {
    const err = new Error("Không tìm thấy người nhận phù hợp với bộ lọc đã chọn");
    err.statusCode = 400;
    throw err;
  }

  const activeRound = (contest.rounds || []).find((r) => r.is_active);

  const prompt = `Soạn một email tiếng Việt chuyên nghiệp, lịch sự cho cuộc thi hackathon "${contest.title}".
Mục đích email: ${templateInfo.intent}
${activeRound ? `Vòng thi hiện tại: ${activeRound.name}, hạn nộp bài: ${activeRound.submission_deadline ? new Date(activeRound.submission_deadline).toLocaleString("vi-VN") : "chưa đặt"}.` : ""}
${custom_notes ? `Ghi chú thêm từ ban tổ chức cần lồng ghép vào nội dung: ${custom_notes}` : ""}

Email này sẽ được gửi hàng loạt cho nhiều đội khác nhau, vì vậy PHẢI dùng đúng 2 placeholder sau trong nội dung để cá nhân hóa, không thay bằng giá trị cụ thể: {{leader_name}} (tên trưởng nhóm) và {{team_name}} (tên đội thi).
Nội dung trả về ở dạng HTML đơn giản, chỉ dùng thẻ <p> và <strong>, không dùng markdown, không dùng thẻ <html>/<body>.`;

  const response = await generateWithTimeout({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          body_html: { type: Type.STRING },
        },
        required: ["subject", "body_html"],
      },
    },
  });

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error("AI trả về định dạng không hợp lệ, vui lòng thử lại");
  }

  return {
    subject: parsed.subject,
    body_html: parsed.body_html,
    recipients,
    template_label: templateInfo.label,
    contest_title: contest.title,
  };
};

const fillTemplate = (str, vars) =>
  String(str)
    .replace(/{{\s*leader_name\s*}}/g, vars.leader_name)
    .replace(/{{\s*team_name\s*}}/g, vars.team_name);

export const sendGeneratedEmail = async ({ subject, body_html, recipients }) => {
  let sent = 0;
  const failed = [];
  for (const r of recipients) {
    try {
      await sendCustomEmail(r.leader_email, fillTemplate(subject, r), fillTemplate(body_html, r));
      sent++;
    } catch (err) {
      failed.push({ team_name: r.team_name, error: err.message });
    }
  }
  return { sent, failed, total: recipients.length };
};
