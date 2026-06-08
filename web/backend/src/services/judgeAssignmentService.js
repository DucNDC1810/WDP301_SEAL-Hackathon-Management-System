import crypto from "crypto";
import mongoose from "mongoose";
import JudgeAssignment from "../models/JudgeAssignment.js";
import MentorAssignment from "../models/MentorAssignment.js";
import Invitation from "../models/Invitation.js";
import Contest from "../models/Contest.js";
import Team from "../models/Team.js";
import User from "../models/User.js";
import { sendJudgeInvitationEmail } from "./emailService.js";

// ─── assignJudge ──────────────────────────────────────────────────────────────

/**
 * INTERNAL: chọn user có role judge/mentor → assign ngay, không cần invitation.
 * EXTERNAL: nhập email → tạo Invitation → gửi email → tài khoản tạo khi họ xác nhận.
 */
export const assignJudge = async ({
  contest_id, round_id, pool_id, team_id,
  judge_id, external_email, judge_type = "INTERNAL", assigned_by,
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

  // Validate team
  const team = await Team.findById(team_id);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi"); err.statusCode = 404; throw err;
  }

  // ── EXTERNAL flow ─────────────────────────────────────────────────────────
  if (judge_type === "EXTERNAL") {
    if (!external_email) {
      const err = new Error("Vui lòng nhập email của judge ngoài"); err.statusCode = 400; throw err;
    }
    const email = external_email.toLowerCase().trim();

    // Kiểm tra đã có invitation pending cho email này trong contest chưa
    const existingInv = await Invitation.findOne({ contest_id, email, role: "judge", status: "pending" });
    if (existingInv) {
      const err = new Error("Đã gửi lời mời cho email này, đang chờ xác nhận");
      err.statusCode = 409; throw err;
    }

    // Tạo invitation
    const rawToken = crypto.randomBytes(32).toString("hex");
    const invitation = await Invitation.create({
      contest_id,
      email,
      role: "judge",
      invited_by: assigned_by,
      token: rawToken,
      token_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "pending",
    });

    // Tạo JudgeAssignment ở trạng thái chờ
    const assignment = await JudgeAssignment.create({
      contest_id, round_id,
      pool_id: pool_id || null,
      team_id,
      judge_id: null,
      external_email: email,
      invitation_id: invitation._id,
      invitation_status: "pending_invite",
      judge_type: "EXTERNAL",
      assigned_by,
    });

    // Gửi email không chặn response
    sendJudgeInvitationEmail(email, contest.title, rawToken).catch(e =>
      console.error("[sendJudgeInvitationEmail]", e)
    );

    return { assignment, warnings: ["Đã gửi email mời tới " + email + ". Chờ xác nhận để kích hoạt."] };
  }

  // ── INTERNAL flow ─────────────────────────────────────────────────────────
  if (!judge_id) {
    const err = new Error("Vui lòng chọn judge"); err.statusCode = 400; throw err;
  }

  const judge = await User.findById(judge_id).select("email roles full_name");
  if (!judge) {
    const err = new Error("Không tìm thấy người dùng"); err.statusCode = 404; throw err;
  }

  const hasEligibleRole = judge.roles?.some(
    r => r.role_name === "judge" || r.role_name === "mentor"
  );
  if (!hasEligibleRole) {
    const err = new Error("Người dùng này chưa được gán quyền Judge hoặc Mentor");
    err.statusCode = 400; throw err;
  }

  const isMentorSameRound = await MentorAssignment.exists({ mentor_id: judge_id, contest_id, round_id });

  const assignment = await JudgeAssignment.create({
    contest_id, round_id,
    pool_id: pool_id || null,
    team_id, judge_id,
    judge_type: "INTERNAL",
    invitation_status: "active",
    assigned_by,
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
