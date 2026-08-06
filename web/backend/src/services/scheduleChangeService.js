import crypto from "crypto";
import ScheduleChangeResponse from "../models/ScheduleChangeResponse.js";
import JudgeAssignment from "../models/JudgeAssignment.js";
import MentorAssignment from "../models/MentorAssignment.js";
import Contest from "../models/Contest.js";
import Round from "../models/Round.js";
import { writeLog } from "./auditLog.js";
import { createNotification } from "./notificationService.js";
import { sendCustomEmail } from "./emailService.js";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

/**
 * Tạo 1 bản ghi ScheduleChangeResponse (kèm token) cho từng judge/mentor liên quan
 * tới round vừa bị kích hoạt lệch lịch. Trả về danh sách kèm token để service gọi
 * (routes/round.js) build link email.
 */
export const createScheduleChangeResponses = async ({ contestId, roundId, reason, recipients }) => {
  // recipients: [{ role: 'judge'|'mentor', email, assignment_id, assignment_model }]
  const results = [];
  for (const r of recipients) {
    if (!r.email || !r.assignment_id) continue;
    const token = crypto.randomBytes(32).toString("hex");
    const doc = await ScheduleChangeResponse.create({
      contest_id: contestId,
      round_id: roundId,
      recipient_role: r.role,
      recipient_email: r.email,
      assignment_id: r.assignment_id,
      assignment_model: r.assignment_model,
      reason,
      status: "pending",
      token,
      token_expires: new Date(Date.now() + TOKEN_TTL_MS),
    });
    results.push({ email: r.email, token: doc.token });
  }
  return results;
};

const findResponseByToken = async (token) => {
  if (!token) {
    const err = new Error("Token không hợp lệ"); err.statusCode = 400; throw err;
  }
  const response = await ScheduleChangeResponse.findOne({
    token,
    token_expires: { $gt: new Date() },
  });
  if (!response) {
    const err = new Error("Liên kết không hợp lệ hoặc đã hết hạn"); err.statusCode = 400; throw err;
  }
  return response;
};

export const previewScheduleChangeResponse = async (token) => {
  const response = await findResponseByToken(token);
  const [contest, round] = await Promise.all([
    Contest.findById(response.contest_id).select("title"),
    Round.findById(response.round_id).select("name").lean().then(async (r) => {
      if (r) return r;
      const c = await Contest.findOne({ "rounds._id": response.round_id }).select("rounds.$").lean();
      return c?.rounds?.[0] || null;
    }),
  ]);
  return {
    contest_title: contest?.title || "",
    round_name: round?.name || "",
    recipient_email: response.recipient_email,
    recipient_role: response.recipient_role,
    reason: response.reason,
    status: response.status,
  };
};

/**
 * Judge/mentor xác nhận vẫn tiếp tục tham gia dù lịch bị dời sớm.
 */
export const confirmScheduleChangeResponse = async (token) => {
  const response = await findResponseByToken(token);
  if (response.status !== "pending") {
    const err = new Error("Yêu cầu này đã được xử lý trước đó"); err.statusCode = 400; throw err;
  }
  response.status = "confirmed";
  response.responded_at = new Date();
  await response.save();
  return response;
};

/**
 * Judge/mentor từ chối tiếp tục (rút khỏi vòng do trùng lịch) — xóa assignment
 * tương ứng và báo cho admin/người phân công để tìm người thay.
 */
export const declineScheduleChangeResponse = async (token, { reasonNote } = {}) => {
  const response = await findResponseByToken(token);
  if (response.status !== "pending") {
    const err = new Error("Yêu cầu này đã được xử lý trước đó"); err.statusCode = 400; throw err;
  }

  const contest = await Contest.findById(response.contest_id).select("title");
  const contestTitle = contest?.title || "cuộc thi";
  const roleLabel = response.recipient_role === "judge" ? "Giám khảo" : "Mentor";

  let assignment = null;
  let assignedBy = null;
  if (response.assignment_model === "JudgeAssignment") {
    assignment = await JudgeAssignment.findById(response.assignment_id).populate("assigned_by", "_id email");
    assignedBy = assignment?.assigned_by;
    if (assignment) await JudgeAssignment.deleteOne({ _id: assignment._id });
  } else {
    assignment = await MentorAssignment.findById(response.assignment_id).populate("assigned_by", "_id email");
    assignedBy = assignment?.assigned_by;
    if (assignment) await MentorAssignment.deleteOne({ _id: assignment._id });
  }

  response.status = "declined";
  response.responded_at = new Date();
  await response.save();

  await writeLog({
    action: response.recipient_role === "judge" ? "JUDGE_WITHDREW_ON_SCHEDULE_CHANGE" : "MENTOR_WITHDREW_ON_SCHEDULE_CHANGE",
    actorId: null,
    targetId: response.assignment_id,
    targetModel: response.assignment_model,
    detail: { contest_id: response.contest_id, round_id: response.round_id, email: response.recipient_email, reason: reasonNote || null },
  });

  if (assignedBy) {
    const reasonText = reasonNote ? ` Lý do: ${reasonNote}` : "";
    createNotification({
      user_id: assignedBy._id,
      type: "general",
      title: `${roleLabel} đã rút khỏi vòng thi do đổi lịch`,
      message: `${response.recipient_email} đã từ chối tiếp tục tham gia (${roleLabel.toLowerCase()}) sau khi vòng thi bị dời lịch trong cuộc thi "${contestTitle}". Vui lòng phân công người thay thế.${reasonText}`,
      ref_id: response.round_id,
      ref_type: "Contest",
    }).catch((e) => console.error("[declineScheduleChangeResponse notify]", e));

    if (assignedBy.email) {
      sendCustomEmail(
        assignedBy.email,
        `[SEAL Hackathon] ${response.recipient_email} đã rút khỏi vòng thi do đổi lịch`,
        `<p>Xin chào,</p>
         <p><strong>${response.recipient_email}</strong> (${roleLabel}) đã <strong>từ chối tiếp tục tham gia</strong> sau khi vòng thi bị dời lịch trong cuộc thi <strong>${contestTitle}</strong>.${reasonText}</p>
         <p>Vui lòng phân công ${roleLabel.toLowerCase()} khác thay thế.</p>
         <p>Trân trọng,<br/>Hệ thống SEAL Hackathon</p>`
      ).catch((e) => console.error("[declineScheduleChangeResponse email]", e));
    }
  }

  return response;
};
