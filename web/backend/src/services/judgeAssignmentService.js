import crypto from "crypto";
import mongoose from "mongoose";
import JudgeAssignment from "../models/JudgeAssignment.js";
import MentorAssignment from "../models/MentorAssignment.js";
import Invitation from "../models/Invitation.js";
import Contest from "../models/Contest.js";
import User from "../models/User.js";
import { sendJudgeInvitationEmail } from "./emailService.js";

// ─── assignJudge ──────────────────────────────────────────────────────────────

/**
 * 1 pool = 1 judge (chấm cả bảng).
 * INTERNAL: chọn user có role judge/mentor → assign ngay.
 *   - Nếu là mentor: không được assign vào pool mình đang mentor.
 * EXTERNAL: nhập email → tạo Invitation → gửi email → tài khoản tạo khi xác nhận.
 */
export const assignJudge = async ({
  contest_id, round_id, pool_id,
  judge_id, external_email, judge_type = "INTERNAL", assigned_by,
}) => {
  if (!pool_id) {
    const err = new Error("Vui lòng chọn bảng đấu"); err.statusCode = 400; throw err;
  }

  // Validate contest + round
  const contest = await Contest.findById(contest_id);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi"); err.statusCode = 404; throw err;
  }
  const round = contest.rounds.id(round_id);
  if (!round) {
    const err = new Error("Không tìm thấy vòng thi"); err.statusCode = 404; throw err;
  }

  // Kiểm tra pool đã có judge chưa
  const existingAssignment = await JudgeAssignment.findOne({ pool_id, round_id });
  if (existingAssignment) {
    const err = new Error("Bảng này đã có giám khảo. Xóa phân công cũ trước khi thay.");
    err.statusCode = 409; throw err;
  }

  // ── EXTERNAL flow ──────────────────────────────────────────────────────────
  if (judge_type === "EXTERNAL") {
    if (!external_email) {
      const err = new Error("Vui lòng nhập email của giám khảo ngoài"); err.statusCode = 400; throw err;
    }
    const email = external_email.toLowerCase().trim();

    const existingInv = await Invitation.findOne({ contest_id, email, role: "judge", status: "pending" });
    if (existingInv) {
      const err = new Error("Đã gửi lời mời cho email này, đang chờ xác nhận");
      err.statusCode = 409; throw err;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const invitation = await Invitation.create({
      contest_id, email, role: "judge", invited_by: assigned_by,
      token: rawToken,
      token_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "pending",
    });

    const assignment = await JudgeAssignment.create({
      contest_id, round_id, pool_id,
      judge_id: null,
      external_email: email,
      invitation_id: invitation._id,
      invitation_status: "pending_invite",
      judge_type: "EXTERNAL",
      assigned_by,
    });

    sendJudgeInvitationEmail(email, contest.title, rawToken).catch(e =>
      console.error("[sendJudgeInvitationEmail]", e)
    );

    return { assignment, warnings: [`Đã gửi email mời tới ${email}. Chờ xác nhận để kích hoạt.`] };
  }

  // ── INTERNAL flow ──────────────────────────────────────────────────────────
  if (!judge_id) {
    const err = new Error("Vui lòng chọn giám khảo"); err.statusCode = 400; throw err;
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

  // Chặn mentor chấm bảng mình đang mentor
  const isMentorOfThisPool = await MentorAssignment.exists({
    mentor_id: judge_id, contest_id, round_id, board_id: pool_id,
  });
  if (isMentorOfThisPool) {
    const err = new Error(
      `${judge.full_name} đang là Mentor của bảng này — không thể vừa mentor vừa chấm cùng bảng`
    );
    err.statusCode = 400; throw err;
  }

  const assignment = await JudgeAssignment.create({
    contest_id, round_id, pool_id,
    judge_id,
    judge_type: "INTERNAL",
    invitation_status: "active",
    assigned_by,
  });

  await assignment.populate([
    { path: "judge_id",    select: "full_name email roles" },
    { path: "pool_id",     select: "pool_name" },
    { path: "assigned_by", select: "full_name email" },
  ]);

  return { assignment, warnings: [] };
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
    .populate("pool_id",     "pool_name teams")
    .populate("assigned_by", "full_name email")
    .sort({ created_at: -1 });
};

// ─── getMyJudgeAssignments ────────────────────────────────────────────────────

export const getMyJudgeAssignments = async (judgeId, contestId, roundId) => {
  const query = { judge_id: judgeId };
  if (contestId) query.contest_id = contestId;
  if (roundId)   query.round_id   = roundId;

  return JudgeAssignment.find(query)
    .populate("pool_id", "pool_name teams");
};
