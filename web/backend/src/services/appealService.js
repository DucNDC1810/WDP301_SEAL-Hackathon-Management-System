import Appeal from "../models/Appeal.js";
import Team from "../models/Team.js";

// Resolve the caller's own team within a contest server-side, mirroring the
// pattern used by getMyTeamResults in scoreService.js — never trust a
// client-supplied team_id. Returns null (not a throw) when the user has no
// team, so callers can decide per-endpoint whether that's an error or an
// empty result.
const resolveTeamId = async (contestId, userId) => {
  const team = await Team.findOne({
    contest_id: contestId,
    $or: [{ leader_id: userId }, { "members.user_id": userId }],
  }).select("_id").lean();
  return team ? team._id : null;
};

const mockClassifyAppeal = (content) => {
  const keywords = ["sai", "lỗi", "nhầm", "không đúng", "thiếu"];
  const hasKeyword = keywords.some((k) => content.toLowerCase().includes(k));
  return {
    ai_classification: hasKeyword ? "valid" : "invalid",
    ai_reason: hasKeyword
      ? "Nội dung khiếu nại có dấu hiệu sai sót cần xem xét."
      : "Nội dung khiếu nại không đủ căn cứ rõ ràng.",
  };
};

export const createAppeal = async ({ contest_id, round_id, content, userId }) => {
  const team_id = await resolveTeamId(contest_id, userId);
  if (!team_id) {
    const err = new Error("Bạn chưa có đội thi trong cuộc thi này"); err.statusCode = 404; throw err;
  }

  const existing = await Appeal.findOne({
    team_id, contest_id, round_id,
    status: { $in: ["pending", "reviewing"] },
  });
  if (existing) {
    const err = new Error("Đội đã có khiếu nại đang xử lý"); err.statusCode = 400; throw err;
  }

  const { ai_classification, ai_reason } = mockClassifyAppeal(content);
  const appeal = new Appeal({ team_id, contest_id, round_id, content, ai_classification, ai_reason });
  await appeal.save();
  return appeal;
};

export const getAppealsByContest = async (contestId) => {
  return Appeal.find({ contest_id: contestId })
    .sort({ created_at: -1 })
    .populate("team_id", "team_name")
    .populate("resolved_by", "full_name email");
};

export const getMyAppeals = async (contestId, userId) => {
  const team_id = await resolveTeamId(contestId, userId);
  // No team in this contest is a legitimate "no appeals" answer, not an error.
  if (!team_id) return [];
  return Appeal.find({ team_id, contest_id: contestId }).sort({ created_at: -1 });
};

export const resolveAppeal = async (appealId, resolution, resolvedBy) => {
  const appeal = await Appeal.findById(appealId);
  if (!appeal) {
    const err = new Error("Không tìm thấy khiếu nại"); err.statusCode = 404; throw err;
  }
  if (appeal.status === "resolved_valid" || appeal.status === "resolved_invalid") {
    const err = new Error("Khiếu nại đã được xử lý"); err.statusCode = 400; throw err;
  }
  appeal.status = resolution;
  appeal.resolved_by = resolvedBy;
  appeal.resolved_at = new Date();
  await appeal.save();
  return appeal;
};
