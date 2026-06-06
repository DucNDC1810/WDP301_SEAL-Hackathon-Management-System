import Score from "../models/Score.js";
import ScoreDetail from "../models/ScoreDetail.js";
import MentorAssignment from "../models/MentorAssignment.js";
import JudgeAssignment from "../models/JudgeAssignment.js";
import Contest from "../models/Contest.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

const getRound = async (contestId, roundId) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi"); err.statusCode = 404; throw err;
  }
  const round = contest.rounds.id(roundId);
  if (!round) {
    const err = new Error("Không tìm thấy vòng thi"); err.statusCode = 404; throw err;
  }
  return round;
};

const calcWeightedTotal = (score_details) => {
  const weightSum = score_details.reduce((s, d) => s + d.weight, 0);
  if (weightSum === 0) return 0;
  const raw = score_details.reduce((s, d) => s + d.score_value * d.weight, 0) / weightSum;
  return Math.round(raw * 100) / 100;
};

// ─── createScore ──────────────────────────────────────────────────────────────

/**
 * Judge nhập điểm cho 1 team.
 * judge_id ưu tiên hơn mentor_id (backward compat).
 */
export const createScore = async ({
  team_id, judge_id, mentor_id,
  contest_id, round_id,
  comment, score_details, submit,
  score_type = "NORMAL",
}) => {
  const actorId = judge_id || mentor_id;

  // Guard: scoring_locked
  const round = await getRound(contest_id, round_id);
  if (round.scoring_locked) {
    const err = new Error("Vòng thi đã bị khóa chấm điểm, không thể nhập điểm mới");
    err.statusCode = 403; throw err;
  }

  // Kiểm tra assignment (JudgeAssignment hoặc MentorAssignment)
  const judgeAssigned = await JudgeAssignment.exists({ judge_id: actorId, contest_id, round_id, team_id });
  const mentorAssigned = await MentorAssignment.exists({ mentor_id: actorId, contest_id, round_id, team_id });
  if (!judgeAssigned && !mentorAssigned) {
    const err = new Error("Bạn không được phân công chấm đội này"); err.statusCode = 403; throw err;
  }

  // Không cho nhập lại nếu đã submitted
  const existing = await Score.findOne({ judge_id: actorId, contest_id, round_id, team_id, status: "submitted" });
  if (existing) {
    const err = new Error("Bạn đã nộp điểm cho đội này"); err.statusCode = 400; throw err;
  }

  const total_score = calcWeightedTotal(score_details);

  const score = await Score.create({
    team_id,
    judge_id: actorId,
    mentor_id: actorId,
    contest_id,
    round_id,
    total_score,
    comment,
    score_type,
    status: submit ? "submitted" : "draft",
    is_final: false,
    submitted_at: submit ? new Date() : null,
  });

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

// ─── updateScore ──────────────────────────────────────────────────────────────

export const updateScore = async (scoreId, judgeId, { comment, score_details, submit }) => {
  const score = await Score.findById(scoreId);
  if (!score) {
    const err = new Error("Không tìm thấy điểm"); err.statusCode = 404; throw err;
  }
  if (score.judge_id.toString() !== judgeId.toString() &&
      score.mentor_id?.toString() !== judgeId.toString()) {
    const err = new Error("Không có quyền chỉnh sửa"); err.statusCode = 403; throw err;
  }
  if (score.status === "submitted") {
    const err = new Error("Không thể chỉnh sửa điểm đã nộp"); err.statusCode = 400; throw err;
  }

  // Guard: scoring_locked
  const round = await getRound(score.contest_id, score.round_id);
  if (round.scoring_locked) {
    const err = new Error("Vòng thi đã bị khóa chấm điểm"); err.statusCode = 403; throw err;
  }

  score.total_score = calcWeightedTotal(score_details);
  score.comment = comment;
  if (submit) { score.status = "submitted"; score.submitted_at = new Date(); }
  await score.save();

  await ScoreDetail.deleteMany({ score_id: scoreId });
  await ScoreDetail.insertMany(score_details.map((d) => ({ score_id: scoreId, ...d })));

  return score;
};

// ─── getScoringProgress ───────────────────────────────────────────────────────

export const getScoringProgress = async (contestId, roundId) => {
  const [judgeTotal, mentorTotal, judgeSubmitted, mentorSubmitted] = await Promise.all([
    JudgeAssignment.countDocuments({ contest_id: contestId, round_id: roundId }),
    MentorAssignment.countDocuments({ contest_id: contestId, round_id: roundId }),
    Score.countDocuments({ contest_id: contestId, round_id: roundId, status: "submitted", score_type: "NORMAL" }),
    Score.countDocuments({ contest_id: contestId, round_id: roundId, status: "submitted", score_type: "NORMAL" }),
  ]);

  const total = judgeTotal + mentorTotal;
  const done  = Math.max(judgeSubmitted, mentorSubmitted);
  return { total, done, remaining: Math.max(0, total - done) };
};

// ─── getScoresByRound ─────────────────────────────────────────────────────────

export const getScoresByRound = async (contestId, roundId, { score_type } = {}) => {
  const query = { contest_id: contestId, round_id: roundId };
  if (score_type) query.score_type = score_type;

  return Score.find(query)
    .populate("judge_id", "full_name email")
    .populate("team_id",  "team_name")
    .sort({ created_at: -1 });
};
