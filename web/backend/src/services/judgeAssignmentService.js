import mongoose from "mongoose";
import JudgeAssignment from "../models/JudgeAssignment.js";
import MentorAssignment from "../models/MentorAssignment.js";
import Contest from "../models/Contest.js";
import Team from "../models/Team.js";
import User from "../models/User.js";
import Invitation from "../models/Invitation.js";

const FPT_DOMAINS = ["@fpt.edu.vn", "@fe.edu.vn", "@fpt.com.vn"];

// ─── assignJudge ──────────────────────────────────────────────────────────────

/**
 * Phân công Judge vào Round cho 1 team.
 * - INTERNAL: phải có tài khoản + accept invitation
 * - EXTERNAL: chỉ cần email hợp lệ (không bắt buộc tài khoản)
 * - Warning nếu judge cũng là Mentor cùng round
 */
export const assignJudge = async ({
  contest_id, round_id, pool_id, team_id,
  judge_id, judge_type = "INTERNAL", assigned_by,
}) => {
  // Validate contest + round
  const contest = await Contest.findById(contest_id);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi"); err.statusCode = 404; throw err;
  }
  const round = contest.rounds.id(round_id);
  if (!round) {
    const err = new Error("Không tìm thấy vòng thi"); err.statusCode = 404; throw err;
  }

  // Validate judge user
  const judge = await User.findById(judge_id).select("email roles full_name");
  if (!judge) {
    const err = new Error("Không tìm thấy judge"); err.statusCode = 404; throw err;
  }

  // INTERNAL judge phải accept invitation
  if (judge_type === "INTERNAL") {
    const accepted = await Invitation.findOne({
      email: judge.email,
      contest_id,
      status: "accepted",
    });
    if (!accepted) {
      const err = new Error(
        "Judge INTERNAL phải chấp nhận lời mời tham gia cuộc thi trước khi được phân công"
      );
      err.statusCode = 400; throw err;
    }
  }

  // Validate team
  const team = await Team.findById(team_id);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi"); err.statusCode = 404; throw err;
  }

  // Conflict check: judge có phải Mentor cùng round không?
  const isMentorSameRound = await MentorAssignment.exists({
    mentor_id: judge_id,
    contest_id,
    round_id,
  });

  const assignment = await JudgeAssignment.create({
    contest_id, round_id, pool_id: pool_id || null,
    team_id, judge_id, judge_type, assigned_by,
  });

  await assignment.populate([
    { path: "judge_id",    select: "full_name email" },
    { path: "team_id",     select: "team_name status" },
    { path: "assigned_by", select: "full_name email" },
  ]);

  return {
    assignment,
    warnings: isMentorSameRound
      ? ["Người này vừa là Mentor vừa là Judge trong cùng Round. Hãy kiểm tra lại."]
      : [],
  };
};

// ─── removeJudgeAssignment ────────────────────────────────────────────────────

export const removeJudgeAssignment = async (assignmentId) => {
  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    const err = new Error("Assignment ID không hợp lệ"); err.statusCode = 400; throw err;
  }
  const assignment = await JudgeAssignment.findByIdAndDelete(assignmentId);
  if (!assignment) {
    const err = new Error("Không tìm thấy phân công"); err.statusCode = 404; throw err;
  }
};

// ─── getJudgeAssignmentsByRound ───────────────────────────────────────────────

export const getJudgeAssignmentsByRound = async (contestId, roundId) => {
  return JudgeAssignment.find({ contest_id: contestId, round_id: roundId })
    .populate("judge_id",    "full_name email roles")
    .populate("team_id",     "team_name status")
    .populate("pool_id",     "pool_name")
    .populate("assigned_by", "full_name email")
    .sort({ created_at: -1 });
};

// ─── getMyJudgeAssignments ────────────────────────────────────────────────────

export const getMyJudgeAssignments = async (judgeId, contestId, roundId) => {
  const query = { judge_id: judgeId };
  if (contestId) query.contest_id = contestId;
  if (roundId)   query.round_id   = roundId;

  return JudgeAssignment.find(query)
    .populate("team_id",  "team_name status topic_id")
    .populate("pool_id",  "pool_name");
};
