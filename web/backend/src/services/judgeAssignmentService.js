import crypto from "crypto";
import mongoose from "mongoose";
import JudgeAssignment from "../models/JudgeAssignment.js";
import MentorAssignment from "../models/MentorAssignment.js";
import Invitation from "../models/Invitation.js";
import Contest from "../models/Contest.js";
import User from "../models/User.js";
import Pool from "../models/Pool.js";
import { sendJudgeInvitationEmail, sendJudgeAssignedEmail } from "./emailService.js";
import { notifyJudgeAssignedToPool } from "./notificationService.js";

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

  // ── EXTERNAL flow ──────────────────────────────────────────────────────────
  if (judge_type === "EXTERNAL") {
    if (!external_email || !external_email.trim()) {
      const err = new Error("Vui lòng nhập email của giám khảo ngoài"); err.statusCode = 400; throw err;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(external_email.trim())) {
      const err = new Error("Địa chỉ email của giám khảo ngoài không hợp lệ"); err.statusCode = 400; throw err;
    }
    const email = external_email.toLowerCase().trim();

    // Kiểm tra trùng lặp phân công cho giám khảo ngoại
    const existingUser = await User.findOne({ email });
    const duplicateQuery = { pool_id, round_id };
    if (existingUser) {
      duplicateQuery.judge_id = existingUser._id;
    } else {
      duplicateQuery.external_email = email;
    }
    const dup = await JudgeAssignment.findOne(duplicateQuery);
    if (dup) {
      const err = new Error("Giám khảo này đã được phân công chấm bảng này trong vòng thi.");
      err.statusCode = 409; throw err;
    }
    if (existingUser) {
      // Chặn mentor chấm bảng mình đang mentor
      const isMentorOfThisPool = await MentorAssignment.exists({
        mentor_id: existingUser._id, contest_id, round_id, board_id: pool_id,
      });
      if (isMentorOfThisPool) {
        const err = new Error(
          `${existingUser.full_name || email} đang là Mentor của bảng này — không thể vừa mentor vừa chấm cùng bảng`
        );
        err.statusCode = 400; throw err;
      }

      // Gán role judge nếu chưa có
      const hasJudgeRole = existingUser.roles?.some((r) => r.role_name === "judge");
      if (!hasJudgeRole) {
        existingUser.roles = existingUser.roles || [];
        existingUser.roles.push({
          role_id: new mongoose.Types.ObjectId(),
          role_name: "judge",
        });
        await existingUser.save();
      }

      // Tạo JudgeAssignment trực tiếp ở trạng thái active
      const assignment = await JudgeAssignment.create({
        contest_id, round_id, pool_id,
        judge_id: existingUser._id,
        external_email: email,
        invitation_id: null,
        invitation_status: "active",
        judge_type: "EXTERNAL",
        assigned_by,
      });

      await assignment.populate([
        { path: "judge_id",    select: "full_name email roles" },
        { path: "pool_id",     select: "pool_name" },
        { path: "assigned_by", select: "full_name email" },
      ]);

      // Gửi mail thông báo phân công cho thành viên nội bộ
      const poolObj = await Pool.findById(pool_id).select("pool_name");
      sendJudgeAssignedEmail(
        email,
        existingUser.full_name || email,
        contest.title,
        poolObj?.pool_name || "Bảng đấu"
      ).catch(e => console.error("[sendJudgeAssignedEmail]", e));

      return {
        assignment,
        warnings: [
          `Email "${email}" thuộc tài khoản nội bộ (${existingUser.full_name || email}). Hệ thống đã tự động phân công trực tiếp!`
        ],
      };
    }

    const existingInv = await Invitation.findOne({ contest_id, email, role: "judge", status: "pending" });
    if (existingInv) {
      const hasAssignment = await JudgeAssignment.exists({ invitation_id: existingInv._id });
      if (!hasAssignment) {
        await Invitation.deleteOne({ _id: existingInv._id });
      } else {
        const err = new Error("Đã gửi lời mời cho email này, đang chờ xác nhận");
        err.statusCode = 409; throw err;
      }
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

  // Kiểm tra trùng lặp phân công cho giám khảo nội bộ
  const dup = await JudgeAssignment.findOne({ pool_id, round_id, judge_id });
  if (dup) {
    const err = new Error("Giám khảo này đã được phân công chấm bảng này trong vòng thi.");
    err.statusCode = 409; throw err;
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

  // Gửi thông báo thời gian thực và email cho Giám khảo
  try {
    const judgeUser = assignment.judge_id;
    const poolObj = assignment.pool_id;
    if (judgeUser && poolObj) {
      await notifyJudgeAssignedToPool({
        user_id: judgeUser._id,
        contestTitle: contest.title,
        poolName: poolObj.pool_name,
        ref_id: contest._id,
      });

      sendJudgeAssignedEmail(
        judgeUser.email,
        judgeUser.full_name || "Giám khảo",
        contest.title,
        poolObj.pool_name
      ).catch((mailErr) => console.error("[sendJudgeAssignedEmail error]", mailErr));
    }
  } catch (notifErr) {
    console.error("[assignJudge notification error]", notifErr);
  }

  return { assignment, warnings: [] };
};

// ─── removeJudgeAssignment ────────────────────────────────────────────────────

export const removeJudgeAssignment = async (assignmentId) => {
  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    const err = new Error("Assignment ID không hợp lệ"); err.statusCode = 400; throw err;
  }
  const assignment = await JudgeAssignment.findById(assignmentId);
  if (!assignment) {
    const err = new Error("Không tìm thấy phân công"); err.statusCode = 404; throw err;
  }

  if (assignment.judge_type === "EXTERNAL" && assignment.invitation_id) {
    await Invitation.deleteOne({ _id: assignment.invitation_id });
  }

  await JudgeAssignment.findByIdAndDelete(assignmentId);
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

  const assignments = await JudgeAssignment.find(query)
    .populate("contest_id", "title start_date end_date status rounds score_criteria")
    .populate({
      path: "pool_id",
      select: "pool_name teams",
      populate: {
        path: "teams",
        select: "team_name status topic_id members leader_id",
        populate: { path: "topic_id", select: "title" },
      },
    })
    .sort({ created_at: -1 });

  const Team = mongoose.models.Team || mongoose.model("Team");
  const results = [];

  for (const doc of assignments) {
    const obj = doc.toObject();
    if (!obj.pool_id) {
      // Fetch all active/confirmed teams in this contest to display as finalist teams
      const activeTeams = await Team.find({
        contest_id: obj.contest_id?._id || obj.contest_id,
        status: { $in: ["ACTIVE", "CONFIRMED"] }
      })
      .select("team_name status topic_id members leader_id")
      .populate({ path: "topic_id", select: "title" })
      .lean();

      obj.pool_id = {
        _id: null,
        pool_name: "Chung kết",
        teams: activeTeams
      };
    }
    results.push(obj);
  }

  return results;
};
