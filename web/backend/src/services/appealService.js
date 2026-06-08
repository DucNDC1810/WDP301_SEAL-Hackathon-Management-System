import Appeal from "../models/Appeal.js";

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

export const createAppeal = async ({ team_id, contest_id, round_id, content }) => {
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

export const getMyAppeals = async (teamId, contestId) => {
  return Appeal.find({ team_id: teamId, contest_id: contestId }).sort({ created_at: -1 });
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
