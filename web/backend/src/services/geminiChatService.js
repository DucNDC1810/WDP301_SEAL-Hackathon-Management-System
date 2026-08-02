import mongoose from "mongoose";
import { GoogleGenAI, createUserContent, createPartFromFunctionResponse } from "@google/genai";
import Contest from "../models/Contest.js";
import Team from "../models/Team.js";
import Submission from "../models/Submission.js";
import Score from "../models/Score.js";
import JudgeAssignment from "../models/JudgeAssignment.js";
import MentorAssignment from "../models/MentorAssignment.js";
import User from "../models/User.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3-flash-preview";
const MAX_TOOL_LOOPS = 5;

const SYSTEM_INSTRUCTION = `Bạn là trợ lý AI hỗ trợ Admin quản trị hệ thống thi Hackathon "SEAL".
Nhiệm vụ duy nhất của bạn là trả lời các câu hỏi liên quan trực tiếp đến thống kê, điều hành và quy định của cuộc thi trong hệ thống.

MỘT SỐ QUY ĐỊNH CỦA HỆ THỐNG SEAL HACKATHON MÀ BẠN CẦN BIẾT:
- Số lượng thành viên trong mỗi đội: Bắt buộc ĐÚNG 4 người (kể cả trưởng nhóm). Các đội không đủ hoặc vượt quá 4 người sẽ không được phép đăng ký tham gia cuộc thi.
- Sinh viên bắt buộc phải cập nhật thông tin cá nhân (Profile) đầy đủ và được Admin duyệt thì mới được đăng ký thi.

QUY TẮC BẮT BUỘC VÀ NGHIÊM NGẶT:
1. TỪ CHỐI TRẢ LỜI mọi câu hỏi không liên quan đến cuộc thi, hệ thống SEAL Hackathon, hoặc nằm ngoài phạm vi quản trị. Nếu người dùng hỏi bậy, hỏi thông tin cá nhân, kiến thức chung, lập trình, v.v., hãy lịch sự từ chối và nhắc nhở họ bạn chỉ hỗ trợ về hệ thống Hackathon.
2. DỮ LIỆU THẬT 100%: LUÔN LUÔN gọi các tool được cung cấp để tra cứu dữ liệu thực tế từ cơ sở dữ liệu (danh sách đội, cuộc thi, v.v.). Tuyệt đối KHÔNG ĐƯỢC tự bịa đặt, suy đoán, hoặc sử dụng kiến thức bên ngoài để trả lời về số liệu, trạng thái, thời gian. Đối với các câu hỏi về quy định hệ thống đã cung cấp ở trên (như số lượng người mỗi đội), bạn có thể trả lời trực tiếp mà không cần gọi tool.
3. Nếu câu hỏi không cung cấp đủ thông tin (vd: tên cuộc thi), hãy dùng tool list_contests để tra cứu hoặc yêu cầu người dùng làm rõ.
3b. Khi được hỏi về tiến độ nộp bài hoặc đội nào chưa nộp, dùng tool get_submission_progress. Khi được hỏi về tiến độ chấm điểm hoặc giám khảo nào chưa chấm xong, dùng tool get_scoring_progress.
4. Nếu kết quả từ tool trả về không tìm thấy, hãy thông báo là không tìm thấy, không được cố gắng đoán.
5. Chỉ giao tiếp bằng tiếng Việt, trả lời ngắn gọn, súc tích và đi thẳng vào vấn đề.`;

const tools = [
  {
    functionDeclarations: [
      {
        name: "list_contests",
        description: "Lấy danh sách tất cả cuộc thi (hackathon) trong hệ thống kèm trạng thái và mốc thời gian. Dùng khi cần tra tên/ID cuộc thi hoặc khi admin hỏi tổng quan tất cả cuộc thi.",
        parametersJsonSchema: { type: "object", properties: {} },
      },
      {
        name: "get_contest_details",
        description: "Lấy thông tin chi tiết một cuộc thi cụ thể: ngày bắt đầu/kết thúc, hạn đăng ký, danh sách vòng thi và hạn nộp bài từng vòng.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Tên (toàn bộ hoặc một phần) hoặc ID MongoDB của cuộc thi" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_contest_stats",
        description: "Lấy số liệu thống kê của một cuộc thi cụ thể: số đội đăng ký, tổng số người tham gia, số giám khảo và mentor được phân công.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Tên (toàn bộ hoặc một phần) hoặc ID MongoDB của cuộc thi" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_submission_progress",
        description: "Kiểm tra tiến độ nộp bài của một vòng thi cụ thể: số đội đã nộp, chưa nộp, nộp trễ đang chờ duyệt, kèm danh sách tên các đội chưa nộp bài. Dùng khi admin hỏi 'còn đội nào chưa nộp bài', 'tiến độ nộp bài vòng X'.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            contest_query: { type: "string", description: "Tên (toàn bộ hoặc một phần) hoặc ID MongoDB của cuộc thi" },
            round_number: { type: "number", description: "Số thứ tự vòng thi (vd: 1, 2). Nếu không cung cấp, dùng vòng đang active." },
          },
          required: ["contest_query"],
        },
      },
      {
        name: "get_scoring_progress",
        description: "Kiểm tra tiến độ chấm điểm của một vòng thi cụ thể: mỗi giám khảo được phân công bao nhiêu đội, đã chấm (submitted) bao nhiêu, còn thiếu bao nhiêu. Dùng khi admin hỏi 'giám khảo nào chưa chấm xong', 'tiến độ chấm điểm vòng X'.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            contest_query: { type: "string", description: "Tên (toàn bộ hoặc một phần) hoặc ID MongoDB của cuộc thi" },
            round_number: { type: "number", description: "Số thứ tự vòng thi (vd: 1, 2). Nếu không cung cấp, dùng vòng đang active." },
          },
          required: ["contest_query"],
        },
      },
    ],
  },
];

const resolveRound = (contest, round_number) => {
  const rounds = contest.rounds || [];
  if (round_number != null) {
    return rounds.find((r) => r.round_number === round_number) || null;
  }
  return rounds.find((r) => r.is_active) || null;
};

const resolveContest = async (query) => {
  if (!query) return null;
  if (mongoose.isValidObjectId(query)) {
    const byId = await Contest.findById(query);
    if (byId) return byId;
  }
  const escaped = String(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Contest.findOne({ title: { $regex: escaped, $options: "i" } }).sort({ created_at: -1 });
};

const executors = {
  list_contests: async () => {
    const contests = await Contest.find()
      .select("title status start_date end_date registration_deadline")
      .sort({ created_at: -1 });
    return {
      contests: contests.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        status: c.status,
        start_date: c.start_date,
        end_date: c.end_date,
        registration_deadline: c.registration_deadline,
      })),
    };
  },

  get_contest_details: async ({ query }) => {
    const contest = await resolveContest(query);
    if (!contest) return { error: `Không tìm thấy cuộc thi khớp với "${query}"` };
    return {
      id: contest._id.toString(),
      title: contest.title,
      status: contest.status,
      start_date: contest.start_date,
      end_date: contest.end_date,
      registration_deadline: contest.registration_deadline,
      max_teams_per_pool: contest.max_teams_per_pool,
      wildcard_enabled: contest.wildcard_enabled,
      individual_ranking_enabled: contest.individual_ranking_enabled,
      rounds: (contest.rounds || []).map((r) => ({
        round_number: r.round_number,
        name: r.name,
        is_active: r.is_active,
        start_time: r.start_time,
        end_time: r.end_time,
        submission_deadline: r.submission_deadline,
        top_n_advance: r.top_n_advance,
      })),
    };
  },

  get_contest_stats: async ({ query }) => {
    const contest = await resolveContest(query);
    if (!contest) return { error: `Không tìm thấy cuộc thi khớp với "${query}"` };

    const teams = await Team.find({ contest_id: contest._id }).select("members status");
    const teams_count = teams.length;
    const total_participants = teams.reduce((sum, t) => sum + 1 + (t.members?.length || 0), 0);

    const teams_by_status = teams.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    const [judges_assigned, mentors_assigned] = await Promise.all([
      JudgeAssignment.countDocuments({ contest_id: contest._id }),
      MentorAssignment.countDocuments({ contest_id: contest._id, status: "accepted" }),
    ]);

    return {
      contest_title: contest.title,
      teams_count,
      total_participants,
      teams_by_status,
      judges_assigned,
      mentors_assigned,
    };
  },

  get_submission_progress: async ({ contest_query, round_number }) => {
    const contest = await resolveContest(contest_query);
    if (!contest) return { error: `Không tìm thấy cuộc thi khớp với "${contest_query}"` };
    const round = resolveRound(contest, round_number);
    if (!round) return { error: `Không tìm thấy vòng thi phù hợp trong "${contest.title}"` };

    const eligibleTeams = await Team.find({
      contest_id: contest._id,
      status: { $in: ["ACTIVE", "CONFIRMED"] },
    }).select("team_name");

    const submissions = await Submission.find({ round_id: round._id }).select("team_id status");
    const submittedTeamIds = new Set(submissions.map((s) => s.team_id.toString()));

    const notSubmitted = eligibleTeams.filter((t) => !submittedTeamIds.has(t._id.toString()));
    const statusCounts = submissions.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    return {
      contest_title: contest.title,
      round_name: round.name,
      round_number: round.round_number,
      submission_deadline: round.submission_deadline,
      eligible_teams_count: eligibleTeams.length,
      submitted_count: submissions.length,
      not_submitted_count: notSubmitted.length,
      status_counts: statusCounts,
      not_submitted_teams: notSubmitted.map((t) => t.team_name),
    };
  },

  get_scoring_progress: async ({ contest_query, round_number }) => {
    const contest = await resolveContest(contest_query);
    if (!contest) return { error: `Không tìm thấy cuộc thi khớp với "${contest_query}"` };
    const round = resolveRound(contest, round_number);
    if (!round) return { error: `Không tìm thấy vòng thi phù hợp trong "${contest.title}"` };

    const assignments = await JudgeAssignment.find({
      contest_id: contest._id,
      round_id: round._id,
    }).select("judge_id pool_id external_email");

    const scores = await Score.find({
      contest_id: contest._id,
      round_id: round._id,
      status: "submitted",
    }).select("judge_id team_id");

    const judgeIds = assignments.map((a) => a.judge_id).filter(Boolean);
    const judges = await User.find({ _id: { $in: judgeIds } }).select("full_name email");
    const judgeNameById = new Map(judges.map((j) => [j._id.toString(), j.full_name || j.email]));

    const poolTeamCounts = new Map();
    for (const a of assignments) {
      if (!a.pool_id) continue;
      if (!poolTeamCounts.has(a.pool_id.toString())) {
        const pool = await mongoose.model("Pool").findById(a.pool_id).select("teams");
        poolTeamCounts.set(a.pool_id.toString(), pool?.teams?.length || 0);
      }
    }

    const scoredCountByJudge = scores.reduce((acc, s) => {
      const key = s.judge_id.toString();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const judgeProgress = assignments
      .filter((a) => a.judge_id)
      .map((a) => {
        const key = a.judge_id.toString();
        const teamsInPool = a.pool_id ? poolTeamCounts.get(a.pool_id.toString()) || 0 : 0;
        return {
          judge_name: judgeNameById.get(key) || a.external_email || "Không rõ",
          teams_assigned: teamsInPool,
          scored_count: scoredCountByJudge[key] || 0,
        };
      });

    return {
      contest_title: contest.title,
      round_name: round.name,
      round_number: round.round_number,
      total_judges: judgeProgress.length,
      judge_progress: judgeProgress,
    };
  },
};

// ─── Dashboard stats cho AI Assistant page (status cards) ─────────────────────

export const getDashboardStats = async () => {
  // Xét theo round đang active thay vì contest.status: dữ liệu thực tế có thể có
  // round is_active=true trong khi status chưa được cập nhật đồng bộ (đóng thủ công, v.v.)
  const contests = await Contest.find({ "rounds.is_active": true }).select(
    "title status rounds auto_close registration_deadline"
  );

  let timeline = null;
  const now = Date.now();
  let closestDeadline = null;
  for (const contest of contests) {
    if (contest.status === "open" && contest.auto_close && contest.registration_deadline) {
      const diff = new Date(contest.registration_deadline).getTime() - now;
      if (diff > 0 && (!closestDeadline || diff < closestDeadline.diff)) {
        closestDeadline = {
          diff,
          contest_title: contest.title,
          phase: "Đăng ký",
          deadline: contest.registration_deadline,
        };
      }
    }
    for (const round of contest.rounds || []) {
      if (!round.is_active || !round.submission_deadline) continue;
      const diff = new Date(round.submission_deadline).getTime() - now;
      if (diff > 0 && (!closestDeadline || diff < closestDeadline.diff)) {
        closestDeadline = {
          diff,
          contest_title: contest.title,
          phase: round.name,
          deadline: round.submission_deadline,
        };
      }
    }
  }
  if (closestDeadline) {
    timeline = {
      contest_title: closestDeadline.contest_title,
      phase: closestDeadline.phase,
      deadline: closestDeadline.deadline,
    };
  }

  const activeRoundIds = [];
  for (const contest of contests) {
    for (const round of contest.rounds || []) {
      if (round.is_active) activeRoundIds.push(round._id);
    }
  }

  const [totalSubmissions, scoredSubmissionIds] = await Promise.all([
    Submission.countDocuments({ round_id: { $in: activeRoundIds } }),
    Score.distinct("submission_id", { round_id: { $in: activeRoundIds }, status: "submitted" }),
  ]);
  const scoredCount = scoredSubmissionIds.filter(Boolean).length;

  return {
    active_contests_count: contests.length,
    timeline,
    scoring: {
      total_submissions: totalSubmissions,
      scored_submissions: scoredCount,
    },
  };
};

const GENERATION_TIMEOUT_MS = 25000;

const generateWithTimeout = (params) => {
  return Promise.race([
    ai.models.generateContent(params),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Trợ lý AI phản hồi quá lâu, vui lòng thử lại.")), GENERATION_TIMEOUT_MS)
    ),
  ]);
};

export const runAdminChat = async (history = [], userMessage) => {
  const contents = [...history, createUserContent(userMessage)];

  for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
    const response = await generateWithTimeout({
      model: MODEL,
      contents,
      config: { systemInstruction: SYSTEM_INSTRUCTION, tools },
    });

    const calls = response.functionCalls;
    if (!calls || calls.length === 0) {
      return { reply: response.text || "Xin lỗi, tôi chưa có câu trả lời phù hợp.", history: contents };
    }

    contents.push(response.candidates[0].content);

    const responseParts = [];
    for (const call of calls) {
      const exec = executors[call.name];
      let result;
      try {
        result = exec ? await exec(call.args || {}) : { error: `Không hỗ trợ hàm "${call.name}"` };
      } catch (err) {
        result = { error: err.message || "Lỗi khi truy vấn dữ liệu" };
      }
      responseParts.push(createPartFromFunctionResponse(call.id ?? call.name, call.name, result));
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return { reply: "Yêu cầu này cần quá nhiều bước để xử lý, vui lòng hỏi cụ thể hơn.", history: contents };
};
