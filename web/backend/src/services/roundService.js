import Contest from "../models/Contest.js";
import Score from "../models/Score.js";
import JudgeAssignment from "../models/JudgeAssignment.js";
import MentorAssignment from "../models/MentorAssignment.js";
import User from "../models/User.js";
import { createBulkNotifications } from "./notificationService.js";
import Team from "../models/Team.js";
import Submission from "../models/Submission.js";
import { writeLog } from "./auditLog.js";
import { sendNotification } from "./notification.js";
import { calculateRankings } from "./rankingService.js";
import { getIO } from "../socket/index.js";

const WEIGHT_TOLERANCE = 0.01;

// ─── activateRound ────────────────────────────────────────────────────────────

/**
 * Kích hoạt Round: validate weight tổng = 1.0, enforce 1 active round per contest.
 * Gửi notification cho judges và teams.
 */
export const activateRound = async (contestId, roundId, actorId) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi"); err.statusCode = 404; throw err;
  }

  const round = contest.rounds.id(roundId);
  if (!round) {
    const err = new Error("Không tìm thấy vòng thi"); err.statusCode = 404; throw err;
  }

  if (round.is_active) {
    const err = new Error("Vòng thi này đã được kích hoạt"); err.statusCode = 409; throw err;
  }

  // Validate tổng weight criteria = 1.0
  if (!round.score_criteria || round.score_criteria.length === 0) {
    const err = new Error("Vòng thi chưa có tiêu chí chấm điểm"); err.statusCode = 400; throw err;
  }
  const totalWeight = round.score_criteria.reduce((sum, c) => sum + c.weight, 0);
  if (Math.abs(totalWeight - 1.0) > WEIGHT_TOLERANCE) {
    const err = new Error(
      `Tổng weight của các tiêu chí phải bằng 1.0 (hiện tại: ${totalWeight.toFixed(4)})`
    );
    err.statusCode = 400; throw err;
  }

  // Enforce: chỉ 1 round active tại một thời điểm trong contest
  const activeRound = contest.rounds.find((r) => r.is_active && r._id.toString() !== roundId);
  if (activeRound) {
    const err = new Error(
      `Đang có vòng thi "${activeRound.name}" đang active. Hãy deactivate trước.`
    );
    err.statusCode = 409; throw err;
  }

  round.is_active = true;
  await contest.save();

  // Gửi notification cho tất cả judges được assign trong round
  const judgeAssignments = await JudgeAssignment.find({ contest_id: contestId, round_id: roundId }).distinct("judge_id");
  const mentorAssignments = await MentorAssignment.find({ contest_id: contestId, round_id: roundId }).distinct("mentor_id");
  const recipientIds = [...new Set([...judgeAssignments.map(String), ...mentorAssignments.map(String)])];

  if (recipientIds.length > 0) {
    createBulkNotifications({
      user_ids: recipientIds,
      type: "general",
      title: `Vòng thi "${round.name}" đã bắt đầu`,
      message: `Cuộc thi "${contest.title}" — vòng "${round.name}" đã được kích hoạt. Vui lòng bắt đầu chấm điểm.`,
      ref_id: contestId,
      ref_type: "Contest",
    }).catch((e) => console.error("[activateRound notify]", e));
  }

  return round;
};

// ─── deactivateRound ──────────────────────────────────────────────────────────

export const deactivateRound = async (contestId, roundId) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi"); err.statusCode = 404; throw err;
  }
  const round = contest.rounds.id(roundId);
  if (!round) {
    const err = new Error("Không tìm thấy vòng thi"); err.statusCode = 404; throw err;
  }
  round.is_active = false;
  await contest.save();
  return round;
};

// ─── lockScoring ──────────────────────────────────────────────────────────────

/**
 * Khóa chấm điểm cho round.
 * Kiểm tra judge chưa chấm đủ. Force-lock cần force_lock_reason.
 */
export const lockScoring = async (contestId, roundId, { force = false, force_lock_reason } = {}) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi"); err.statusCode = 404; throw err;
  }
  const round = contest.rounds.id(roundId);
  if (!round) {
    const err = new Error("Không tìm thấy vòng thi"); err.statusCode = 404; throw err;
  }
  if (round.scoring_locked) {
    const err = new Error("Vòng thi này đã bị khóa chấm điểm"); err.statusCode = 409; throw err;
  }

  // Kiểm tra judge chưa chấm đủ
  const totalAssignments = await JudgeAssignment.countDocuments({ contest_id: contestId, round_id: roundId });
  const submittedScores = await Score.countDocuments({
    contest_id: contestId,
    round_id: roundId,
    status: "submitted",
    score_type: "NORMAL",
  });

  const incomplete = totalAssignments - submittedScores;
  if (incomplete > 0 && !force) {
    const err = new Error(
      `Còn ${incomplete} judge chưa chấm đủ. Dùng force_lock=true và nhập force_lock_reason để buộc khóa.`
    );
    err.statusCode = 400; throw err;
  }

  if (force) {
    if (!force_lock_reason || !force_lock_reason.trim()) {
      const err = new Error("Phải nhập force_lock_reason khi dùng force-lock"); err.statusCode = 400; throw err;
    }
    round.force_lock_reason = force_lock_reason.trim();
  }

  round.scoring_locked = true;
  await contest.save();

  // Batch set is_final = true cho tất cả score NORMAL của round
  await Score.updateMany(
    { contest_id: contestId, round_id: roundId, score_type: "NORMAL", status: "submitted" },
    { is_final: true }
  );

  return round;
};

// ─── getRoundStatus ───────────────────────────────────────────────────────────

export const getRoundStatus = async (contestId, roundId) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi"); err.statusCode = 404; throw err;
  }
  const round = contest.rounds.id(roundId);
  if (!round) {
    const err = new Error("Không tìm thấy vòng thi"); err.statusCode = 404; throw err;
  }

  const [totalJudges, submittedScores, totalTeams] = await Promise.all([
    JudgeAssignment.countDocuments({ contest_id: contestId, round_id: roundId }),
    Score.countDocuments({ contest_id: contestId, round_id: roundId, status: "submitted", score_type: "NORMAL" }),
    JudgeAssignment.distinct("team_id", { contest_id: contestId, round_id: roundId }),
  ]);

  return {
    round_id: round._id,
    name: round.name,
    is_active: round.is_active,
    scoring_locked: round.scoring_locked,
    force_lock_reason: round.force_lock_reason,
    scoring_progress: {
      total_assignments: totalJudges,
      submitted: submittedScores,
      remaining: totalJudges - submittedScores,
      total_teams: totalTeams.length,
    },
    criteria_weight_total: round.score_criteria.reduce((s, c) => s + c.weight, 0),
  };
};

/**
 * Triggers leaderboard re-rank for a given contest, round, and pool.
 *
 * @param {string} contestId
 * @param {string} roundId
 * @param {string} poolId
 */
export const triggerReRank = async (contestId, roundId, poolId) => {
  try {
    if (contestId && roundId) {
      await calculateRankings(contestId.toString(), roundId.toString());
    }
  } catch (error) {
    console.error("[triggerReRank calculateRankings]", error);
  }

  try {
    getIO().emit("leaderboard:rerank", {
      contest_id: contestId ? contestId.toString() : null,
      round_id: roundId ? roundId.toString() : null,
      assigned_group: poolId ? poolId.toString() : null,
    });
  } catch (error) {
    // Socket not initialized or not active
  }
};

/**
 * Set the problem release timestamp for a round.
 *
 * @param {string} roundId
 * @param {string} actorId
 * @returns {Promise<Object>} The updated round subdocument
 */
export const releaseProblem = async (roundId, actorId) => {
  const contest = await Contest.findOne({ "rounds._id": roundId });
  if (!contest) {
    const err = new Error("Không tìm thấy vòng thi/cuộc thi");
    err.statusCode = 404;
    throw err;
  }

  const round = contest.rounds.id(roundId);
  if (!round) {
    const err = new Error("Không tìm thấy vòng thi");
    err.statusCode = 404;
    throw err;
  }

  round.problem_released_at = new Date();
  await contest.save();

  // AuditLog
  await writeLog({
    action: "PROBLEM_RELEASED",
    actorId,
    targetId: roundId,
    targetModel: "Round",
    detail: {
      contest_id: contest._id,
      problem_released_at: round.problem_released_at,
    },
  });

  return round;
};

/**
 * Flags a team as late and eliminates them if they checked-in more than 60 minutes after problem release.
 *
 * @param {string} roundId
 * @param {Object} params
 * @param {string} params.team_id
 * @param {string} params.reason
 * @param {Date|string} [params.check_in_time] - Optional custom check-in time for testing
 * @param {string} actorId
 * @returns {Promise<Object>} The updated team
 */
export const flagLateTeam = async (roundId, { team_id, reason, check_in_time }, actorId) => {
  if (!reason || !reason.trim()) {
    const err = new Error("Phải nhập lý do xử lý trễ");
    err.statusCode = 400;
    throw err;
  }

  const contest = await Contest.findOne({ "rounds._id": roundId });
  if (!contest) {
    const err = new Error("Không tìm thấy vòng thi/cuộc thi");
    err.statusCode = 404;
    throw err;
  }

  const round = contest.rounds.id(roundId);
  if (!round) {
    const err = new Error("Không tìm thấy vòng thi");
    err.statusCode = 404;
    throw err;
  }

  if (!round.problem_released_at) {
    const err = new Error("Đề thi chưa được công bố cho vòng này");
    err.statusCode = 400;
    throw err;
  }

  const team = await Team.findById(team_id);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi");
    err.statusCode = 404;
    throw err;
  }

  const checkIn = check_in_time ? new Date(check_in_time) : new Date();
  const problemRelease = new Date(round.problem_released_at);
  const diffMs = checkIn - problemRelease;
  const minutes_late = Math.ceil(diffMs / (1000 * 60));

  if (minutes_late <= 60) {
    const err = new Error(`Đội thi không trễ quá 60 phút (trễ ${minutes_late} phút)`);
    err.statusCode = 400;
    throw err;
  }

  // Eliminate team
  team.status = "ELIMINATED";
  await team.save();

  // AuditLog
  await writeLog({
    action: "TEAM_LATE_ELIMINATED",
    actorId,
    targetId: team_id,
    targetModel: "Team",
    detail: { minutes_late, reason },
  });

  // Notify team
  const recipientIds = [];
  if (team.leader_id) recipientIds.push(team.leader_id.toString());
  if (team.members && team.members.length > 0) {
    team.members.forEach((m) => {
      if (m.user_id) recipientIds.push(m.user_id.toString());
    });
  }
  const uniqueRecipients = [...new Set(recipientIds)];

  await sendNotification({
    recipientIds: uniqueRecipients,
    type: "general",
    payload: {
      title: "Đội của bạn đã bị loại",
      message: `Đội "${team.team_name}" đã bị loại do check-in trễ ${minutes_late} phút (giới hạn 60 phút kể từ lúc công bố đề). Lý do: ${reason}`,
      ref_id: team._id,
      ref_type: "Team",
    },
  });

  // Emit re-rank signal
  await triggerReRank(contest._id, roundId, team.pool_id);

  return team;
};

/**
 * Checks judge completion status in a round.
 *
 * @param {string} roundId
 * @returns {Promise<Object>} The summary and judge statistics array
 */
export const checkJudgeCompletion = async (roundId) => {
  const assignments = await JudgeAssignment.find({ round_id: roundId }).populate("judge_id", "full_name email");
  const totalSubmissions = await Submission.countDocuments({ round_id: roundId });

  // Get unique judges from assignments
  const judgeMap = {};
  for (const assign of assignments) {
    const judge = assign.judge_id;
    if (!judge) continue;
    const judgeId = judge._id.toString();

    if (!judgeMap[judgeId]) {
      judgeMap[judgeId] = {
        judge_id: judgeId,
        judge_name: judge.full_name || judge.email || "Unknown Judge",
      };
    }
  }

  const judgeResults = [];
  let incompleteCount = 0;

  for (const judgeId of Object.keys(judgeMap)) {
    const judgeInfo = judgeMap[judgeId];

    const scoredCount = await Score.countDocuments({
      round_id: roundId,
      judge_id: judgeId,
      score_type: "NORMAL",
      status: "submitted",
    });

    const missing = Math.max(0, totalSubmissions - scoredCount);
    const complete = scoredCount >= totalSubmissions;

    if (!complete) {
      incompleteCount++;
    }

    judgeResults.push({
      judge_id: judgeInfo.judge_id,
      judge_name: judgeInfo.judge_name,
      scored: scoredCount,
      total: totalSubmissions,
      missing,
      complete,
    });
  }

  return {
    data: judgeResults,
    summary: {
      all_complete: incompleteCount === 0,
      incomplete_count: incompleteCount,
    },
  };
};
