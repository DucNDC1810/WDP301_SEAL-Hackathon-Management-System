import Score from "../models/Score.js";
import ScoreDetail from "../models/ScoreDetail.js";
import MentorAssignment from "../models/MentorAssignment.js";
import JudgeAssignment from "../models/JudgeAssignment.js";
import Contest from "../models/Contest.js";
import Pool from "../models/Pool.js";
import User from "../models/User.js";
import PresentationSlot from "../models/PresentationSlot.js";
import Submission from "../models/Submission.js";

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

  const round = await getRound(contest_id, round_id);

  // Conflict of interest: mentor không được chấm team mình đang hướng dẫn
  const isMentorOfThisTeam = await MentorAssignment.exists({ mentor_id: actorId, contest_id, round_id, team_id });
  if (isMentorOfThisTeam) {
    const err = new Error("Bạn không thể chấm điểm đội mà bạn đang làm mentor (conflict of interest)");
    err.statusCode = 403; throw err;
  }

  // Timing check: judge-role user chỉ chấm được sau khi slot của team bắt đầu
  const actor = await User.findById(actorId).select("roles").lean();
  const actorRoles = (actor?.roles || []).map(r => r.role_name);
  if (actorRoles.includes("judge") && !actorRoles.includes("mentor")) {
    const slot = await PresentationSlot.findOne({
      round_id,
      booked_team_id: team_id,
      status: { $in: ["booked", "completed"] },
    }).select("start_time").lean();
    if (!slot) {
      const err = new Error("Team chưa có lịch trình bày");
      err.statusCode = 403; throw err;
    }
    if (slot.start_time > new Date()) {
      const err = new Error("Chưa đến giờ trình bày của team này");
      err.statusCode = 403; throw err;
    }
  }

  // Kiểm tra assignment
  // Mentor: round-level — any mentor assignment in this round grants scoring rights for OTHER teams
  // (conflict check above already blocks scoring own mentees)
  const mentorAssigned = await MentorAssignment.exists({ mentor_id: actorId, contest_id, round_id });
  // Judge: pool-level — find which pool contains this team, then check judge assignment
  let judgeAssigned = false;
  if (!mentorAssigned) {
    const pool = await Pool.findOne({ contest_id, teams: team_id }).select("_id").lean();
    if (pool) {
      judgeAssigned = !!(await JudgeAssignment.exists({ judge_id: actorId, contest_id, round_id, pool_id: pool._id }));
    }
  }
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

// ─── getMyScores ──────────────────────────────────────────────────────────────

export const getMyScores = async (contestId, roundId, judgeId) => {
  const scores = await Score.find({ contest_id: contestId, round_id: roundId, judge_id: judgeId });
  const scoreIds = scores.map(s => s._id);
  const details = await ScoreDetail.find({ score_id: { $in: scoreIds } });
  return scores.map(s => ({
    ...s.toObject(),
    score_details: details.filter(d => d.score_id.toString() === s._id.toString()),
  }));
};

// ─── getJudgeSchedule ────────────────────────────────────────────────────────

export const getJudgeSchedule = async (contestId, roundId, judgeId) => {
  const assignment = await JudgeAssignment.findOne({ judge_id: judgeId, contest_id: contestId, round_id: roundId })
    .populate("pool_id", "pool_name")
    .lean();

  if (!assignment) return { pool_id: null, pool_name: null, slots: [] };

  const poolId   = assignment.pool_id._id;
  const poolName = assignment.pool_id.pool_name;

  const slots = await PresentationSlot.find({
    contest_id: contestId,
    round_id:   roundId,
    pool_id:    poolId,
    status:     { $in: ["booked", "completed"] },
  })
    .populate("booked_team_id", "team_name")
    .sort({ start_time: 1 })
    .lean();

  if (!slots.length) return { pool_id: poolId, pool_name: poolName, slots: [] };

  const teamIds = slots.map((s) => s.booked_team_id?._id).filter(Boolean);

  const [scores, submissions] = await Promise.all([
    Score.find({ judge_id: judgeId, round_id: roundId, team_id: { $in: teamIds } }).lean(),
    Submission.find({ round_id: roundId, team_id: { $in: teamIds } }).select("team_id repo_url slide_url").lean(),
  ]);

  const scoreDetails = await ScoreDetail.find({ score_id: { $in: scores.map((s) => s._id) } }).lean();

  const scoreByTeam = {};
  for (const sc of scores) {
    scoreByTeam[String(sc.team_id)] = {
      score_id:     sc._id,
      score_status: sc.status,
      total_score:  sc.total_score,
      score_details: scoreDetails
        .filter((d) => String(d.score_id) === String(sc._id))
        .map((d) => ({ criteria_name: d.criteria_name, score_value: d.score_value, weight: d.weight, max_score: d.max_score })),
    };
  }

  const subByTeam = {};
  for (const sub of submissions) {
    subByTeam[String(sub.team_id)] = { repo_url: sub.repo_url, slide_url: sub.slide_url };
  }

  return {
    pool_id:   poolId,
    pool_name: poolName,
    slots: slots.map((slot) => {
      const teamId = String(slot.booked_team_id?._id);
      const sc  = scoreByTeam[teamId] || {};
      const sub = subByTeam[teamId]   || {};
      return {
        slot_id:      slot._id,
        team_id:      slot.booked_team_id?._id,
        team_name:    slot.booked_team_id?.team_name ?? "—",
        start_time:   slot.start_time,
        end_time:     slot.end_time,
        room:         slot.room,
        repo_url:     sub.repo_url  ?? null,
        slide_url:    sub.slide_url ?? null,
        score_status: sc.score_status  ?? null,
        score_id:     sc.score_id      ?? null,
        total_score:  sc.total_score   ?? null,
        score_details: sc.score_details ?? [],
      };
    }),
  };
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
