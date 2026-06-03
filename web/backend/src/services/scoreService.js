import Score from "../models/Score.js";
import ScoreDetail from "../models/ScoreDetail.js";
import MentorAssignment from "../models/MentorAssignment.js";

export const createScore = async ({ team_id, mentor_id, contest_id, round_id, comment, score_details, submit }) => {
  const assignment = await MentorAssignment.findOne({ mentor_id, contest_id, round_id, team_id });
  if (!assignment) {
    const err = new Error("Bạn không được phân công chấm đội này"); err.statusCode = 403; throw err;
  }

  const existing = await Score.findOne({ mentor_id, contest_id, round_id, team_id, status: "submitted" });
  if (existing) {
    const err = new Error("Bạn đã nộp điểm cho đội này"); err.statusCode = 400; throw err;
  }

  let weightedSum = 0, totalWeight = 0;
  for (const d of score_details) {
    weightedSum += d.score_value * d.weight;
    totalWeight += d.weight;
  }
  const total_score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;

  const score = new Score({
    team_id, mentor_id, contest_id, round_id,
    total_score, comment,
    status: submit ? "submitted" : "draft",
    submitted_at: submit ? new Date() : null,
  });
  await score.save();

  await ScoreDetail.insertMany(
    score_details.map((d) => ({
      score_id: score._id,
      criteria_name: d.criteria_name,
      score_value: d.score_value,
      weight: d.weight,
      max_score: d.max_score,
    }))
  );

  return score;
};

export const updateScore = async (scoreId, mentorId, { comment, score_details, submit }) => {
  const score = await Score.findById(scoreId);
  if (!score) {
    const err = new Error("Không tìm thấy điểm"); err.statusCode = 404; throw err;
  }
  if (score.mentor_id.toString() !== mentorId.toString()) {
    const err = new Error("Không có quyền chỉnh sửa"); err.statusCode = 403; throw err;
  }
  if (score.status === "submitted") {
    const err = new Error("Không thể chỉnh sửa điểm đã nộp"); err.statusCode = 400; throw err;
  }

  let weightedSum = 0, totalWeight = 0;
  for (const d of score_details) {
    weightedSum += d.score_value * d.weight;
    totalWeight += d.weight;
  }
  score.total_score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  score.comment = comment;
  if (submit) { score.status = "submitted"; score.submitted_at = new Date(); }
  await score.save();

  await ScoreDetail.deleteMany({ score_id: scoreId });
  await ScoreDetail.insertMany(score_details.map((d) => ({ score_id: scoreId, ...d })));

  return score;
};

export const getScoringProgress = async (contestId, roundId) => {
  const total = await MentorAssignment.countDocuments({ contest_id: contestId, round_id: roundId });
  const done  = await Score.countDocuments({ contest_id: contestId, round_id: roundId, status: "submitted" });
  return { total, done, remaining: total - done };
};
