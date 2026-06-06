import Contest from "../models/Contest.js";
import Score from "../models/Score.js";
import JudgeAssignment from "../models/JudgeAssignment.js";
import MentorAssignment from "../models/MentorAssignment.js";
import User from "../models/User.js";
import { createBulkNotifications } from "./notificationService.js";

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
