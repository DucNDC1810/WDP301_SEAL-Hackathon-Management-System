import mongoose from "mongoose";
import Score from "../models/Score.js";
import ScoreDetail from "../models/ScoreDetail.js";
import MentorAssignment from "../models/MentorAssignment.js";
import JudgeAssignment from "../models/JudgeAssignment.js";
import Contest from "../models/Contest.js";
import Pool from "../models/Pool.js";
import User from "../models/User.js";
import PresentationSlot from "../models/PresentationSlot.js";
import Submission from "../models/Submission.js";
import Team from "../models/Team.js";

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

  // Block scoring after admin locks the round
  if (round.scoring_locked) {
    const err = new Error("Vòng thi đã khóa chấm điểm");
    err.statusCode = 403; throw err;
  }

  // Conflict of interest: mentor không được chấm team mình đang hướng dẫn
  const isMentorOfThisTeam = await MentorAssignment.exists({ mentor_id: actorId, contest_id, round_id, team_id });
  if (isMentorOfThisTeam) {
    const err = new Error("Bạn không thể chấm điểm đội mà bạn đang làm mentor (conflict of interest)");
    err.statusCode = 403; throw err;
  }

  // Timing check: nếu team có lịch trình bày (PresentationSlot), judge-role user
  // chỉ chấm được sau khi slot bắt đầu. Team chưa có lịch (contest không dùng lịch
  // trình bày) thì chấm được ngay — không chặn.
  const actor = await User.findById(actorId).select("roles").lean();
  const actorRoles = (actor?.roles || []).map(r => r.role_name);
  if (actorRoles.includes("judge") && !actorRoles.includes("mentor")) {
    const slot = await PresentationSlot.findOne({
      round_id,
      booked_team_id: team_id,
      status: { $in: ["booked", "completed"] },
    }).select("start_time").lean();
    if (slot && slot.start_time > new Date()) {
      const err = new Error("Chưa đến giờ trình bày của team này");
      err.statusCode = 403; throw err;
    }
  }

  // Kiểm tra assignment
  // Mentor: round-level — any mentor assignment in this round grants scoring rights for OTHER teams
  // (conflict check above already blocks scoring own mentees)
  const mentorAssigned = await MentorAssignment.exists({ mentor_id: actorId, contest_id, round_id });
  // Judge: pool-level or round-level — find which pool contains this team, then check judge assignment
  let judgeAssigned = false;
  if (!mentorAssigned) {
    const pool = await Pool.findOne({ contest_id, round_id, teams: team_id }).select("_id").lean();
    if (pool) {
      judgeAssigned = !!(await JudgeAssignment.exists({ judge_id: actorId, contest_id, round_id, pool_id: pool._id }));
    } else {
      // Direct round assignment (e.g. final round where pools are not created)
      judgeAssigned = !!(await JudgeAssignment.exists({ judge_id: actorId, contest_id, round_id }));
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
    criteria_scores: score_details.map(d => ({
      criteria_name: d.criteria_name,
      weight: d.weight,
      score: d.score_value,
    })),
    total_score,
    weighted_avg_score: total_score,
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

  if (submit) {
    try {
      const { triggerReRank } = await import("./roundService.js");
      const Pool = mongoose.models.Pool || mongoose.model("Pool");
      const pool = await Pool.findOne({ contest_id, round_id, teams: team_id }).select("_id").lean();
      await triggerReRank(contest_id, round_id, pool?._id);
    } catch (e) {
      console.error("Error triggering rerank on score submit:", e);
    }
  }

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

  const round = await getRound(score.contest_id.toString(), score.round_id.toString());
  if (round.scoring_locked) {
    const err = new Error("Vòng thi đã khóa chấm điểm");
    err.statusCode = 403; throw err;
  }

  const total = calcWeightedTotal(score_details);
  score.total_score = total;
  score.weighted_avg_score = total;
  score.comment = comment;
  score.criteria_scores = score_details.map(d => ({
    criteria_name: d.criteria_name,
    weight: d.weight,
    score: d.score_value,
  }));
  if (submit) { score.status = "submitted"; score.submitted_at = new Date(); }
  await score.save();

  await ScoreDetail.deleteMany({ score_id: scoreId });
  await ScoreDetail.insertMany(score_details.map((d) => ({ score_id: scoreId, ...d })));

  if (submit) {
    try {
      const { triggerReRank } = await import("./roundService.js");
      const Pool = mongoose.models.Pool || mongoose.model("Pool");
      const pool = await Pool.findOne({ contest_id: score.contest_id, round_id: score.round_id, teams: score.team_id }).select("_id").lean();
      await triggerReRank(score.contest_id, score.round_id, pool?._id);
    } catch (e) {
      console.error("Error triggering rerank on score update submit:", e);
    }
  }

  return score;
};

// ─── getScoringProgress ───────────────────────────────────────────────────────

export const getScoringProgress = async (contestId, roundId) => {
  const Team = mongoose.models.Team || mongoose.model("Team");

  // Tìm tất cả các phân công giám khảo cho vòng thi này
  const judgeAssignments = await JudgeAssignment.find({ contest_id: contestId, round_id: roundId })
    .populate("pool_id")
    .lean();

  const activeTeamsCount = await Team.countDocuments({ contest_id: contestId, status: { $in: ["ACTIVE", "CONFIRMED"] } });

  let judgeExpectedScores = 0;
  for (const ja of judgeAssignments) {
    if (ja.pool_id && Array.isArray(ja.pool_id.teams)) {
      judgeExpectedScores += ja.pool_id.teams.length;
    } else {
      judgeExpectedScores += activeTeamsCount;
    }
  }

  // Tìm tất cả các phân công mentor cho vòng thi này
  const mentorAssignments = await MentorAssignment.find({ contest_id: contestId, round_id: roundId }).lean();
  const totalTeams = await Team.countDocuments({ contest_id: contestId, status: { $in: ["CONFIRMED", "confirmed"] } });

  // Group by mentor — each mentor scores (totalTeams - their mentee count) teams
  let mentorExpectedScores = 0;
  if (totalTeams > 0 && mentorAssignments.length > 0) {
    const menteesByMentor = new Map();
    for (const ma of mentorAssignments) {
      const mid = ma.mentor_id.toString();
      menteesByMentor.set(mid, (menteesByMentor.get(mid) ?? 0) + 1);
    }
    for (const menteesCount of menteesByMentor.values()) {
      mentorExpectedScores += Math.max(0, totalTeams - menteesCount);
    }
  }

  const total = judgeExpectedScores + mentorExpectedScores;
  const done = await Score.countDocuments({
    contest_id: contestId,
    round_id: roundId,
    status: "submitted",
    score_type: "NORMAL"
  });

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
    .populate("pool_id", "pool_name teams")
    .lean();

  if (!assignment) return { pool_id: null, pool_name: null, slots: [] };

  const poolId   = assignment.pool_id?._id || null;
  const poolName = assignment.pool_id?.pool_name || "Chung kết";
  
  let poolTeamIds = [];
  if (assignment.pool_id) {
    poolTeamIds = (assignment.pool_id.teams || []).map((t) => t.toString());
  } else {
    // If no pool is assigned (e.g. final round), fetch all active/confirmed teams in the contest
    const activeTeams = await Team.find({ contest_id: contestId, status: { $in: ["ACTIVE", "CONFIRMED"] } }).select("_id").lean();
    poolTeamIds = activeTeams.map((t) => t._id.toString());
  }

  const slots = await PresentationSlot.find({
    contest_id: contestId,
    round_id:   roundId,
    ...(poolId ? { pool_id: poolId } : {}),
    status:     { $in: ["booked", "completed"] },
  })
    .populate("booked_team_id", "team_name")
    .sort({ start_time: 1 })
    .lean();

  // Teams trong bảng chưa có slot trình bày (hoặc contest này không dùng lịch trình bày)
  // vẫn phải xuất hiện để judge chấm được ngay — không phụ thuộc PresentationSlot.
  const scheduledTeamIds = new Set(slots.map((s) => s.booked_team_id?._id?.toString()).filter(Boolean));
  const unscheduledTeamIds = poolTeamIds.filter((id) => !scheduledTeamIds.has(id));

  const allTeamIds = [...scheduledTeamIds, ...unscheduledTeamIds];
  if (!allTeamIds.length) return { pool_id: poolId, pool_name: poolName, slots: [] };

  const [scores, submissions, unscheduledTeams] = await Promise.all([
    Score.find({ judge_id: judgeId, round_id: roundId, team_id: { $in: allTeamIds } }).lean(),
    Submission.find({ round_id: roundId, team_id: { $in: allTeamIds } }).select("team_id repo_url slide_url demo_url").lean(),
    unscheduledTeamIds.length
      ? Team.find({ _id: { $in: unscheduledTeamIds } }).select("team_name").lean()
      : [],
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
    subByTeam[String(sub.team_id)] = { repo_url: sub.repo_url, slide_url: sub.slide_url, demo_url: sub.demo_url };
  }

  const buildEntry = (teamId, teamName, slot) => {
    const sc  = scoreByTeam[teamId] || {};
    const sub = subByTeam[teamId]   || {};
    return {
      slot_id:      slot?._id ?? null,
      team_id:      teamId,
      team_name:    teamName ?? "—",
      start_time:   slot?.start_time ?? null,
      end_time:     slot?.end_time ?? null,
      room:         slot?.room ?? null,
      repo_url:     sub.repo_url  ?? null,
      slide_url:    sub.slide_url ?? null,
      demo_url:     sub.demo_url  ?? null,
      score_status: sc.score_status  ?? null,
      score_id:     sc.score_id      ?? null,
      total_score:  sc.total_score   ?? null,
      score_details: sc.score_details ?? [],
    };
  };

  const scheduledEntries = slots.map((slot) =>
    buildEntry(String(slot.booked_team_id?._id), slot.booked_team_id?.team_name, slot)
  );
  const unscheduledEntries = unscheduledTeams.map((t) =>
    buildEntry(String(t._id), t.team_name, null)
  );

  return {
    pool_id:   poolId,
    pool_name: poolName,
    slots: [...scheduledEntries, ...unscheduledEntries],
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
