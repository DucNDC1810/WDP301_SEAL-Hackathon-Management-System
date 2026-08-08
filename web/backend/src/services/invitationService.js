import crypto from "crypto";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Invitation from "../models/Invitation.js";
import JudgeAssignment from "../models/JudgeAssignment.js";
import Contest from "../models/Contest.js";
import User from "../models/User.js";
import { sendInvitationEmail, sendPasswordResetEmail, sendCustomEmail } from "./emailService.js";
import { notifyJudgeAssignedToPool, createNotification } from "./notificationService.js";

const FPT_EMAIL_DOMAINS = ["@fpt.edu.vn", "@fe.edu.vn", "@fpt.com.vn"];

const isFptEmail = (email) =>
  FPT_EMAIL_DOMAINS.some((d) => email.endsWith(d));

// ─── sendInvitation ──────────────────────────────────────────────────────────

/**
 * Admin gửi lời mời mentor tham gia contest.
 * Mỗi email chỉ có 1 invitation pending/accepted per contest.
 */
export const sendInvitation = async (contestId, email, invitedBy) => {
  if (!mongoose.Types.ObjectId.isValid(contestId)) {
    const err = new Error("Contest ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const emailLower = email.toLowerCase().trim();

  if (!isFptEmail(emailLower)) {
    const err = new Error(
      `Chỉ có thể mời tài khoản email FPT (${FPT_EMAIL_DOMAINS.join(", ")})`
    );
    err.statusCode = 400;
    throw err;
  }

  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }

  // Kiểm tra invitation đã tồn tại chưa
  const existing = await Invitation.findOne({ contest_id: contestId, email: emailLower });
  if (existing) {
    if (existing.status === "accepted") {
      const err = new Error("Email này đã chấp nhận lời mời cho cuộc thi này");
      err.statusCode = 409;
      throw err;
    }
    if (existing.status === "declined" || existing.status === "pending") {
      // Tái sử dụng — cấp token mới và gửi lại
      const rawToken = crypto.randomBytes(32).toString("hex");
      existing.token = rawToken;
      existing.token_expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      existing.status = "pending";
      await existing.save();

      sendInvitationEmail(emailLower, contest.title, rawToken, {
        kickoffDate: contest.kickoff_date,
        startDate: contest.start_date,
        endDate: contest.end_date,
      }).catch((err) =>
        console.error("[sendInvitationEmail resend]", err)
      );
      return existing;
    }
    // cancelled / expired → tạo lại
    await Invitation.deleteOne({ _id: existing._id });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");

  const invitation = new Invitation({
    contest_id: contestId,
    email: emailLower,
    role: "mentor",
    invited_by: invitedBy,
    token: rawToken,
    token_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
    status: "pending",
  });

  await invitation.save();

  sendInvitationEmail(emailLower, contest.title, rawToken, {
    kickoffDate: contest.kickoff_date,
    startDate: contest.start_date,
    endDate: contest.end_date,
  }).catch((err) =>
    console.error("[sendInvitationEmail]", err)
  );

  return invitation;
};

// ─── acceptInvitation ────────────────────────────────────────────────────────

/**
 * Mentor click link xác nhận → được gán role mentor.
 * Nếu chưa có tài khoản thì trả về thông tin để frontend redirect đến trang đăng ký.
 */
export const acceptInvitation = async (token) => {
  if (!token) {
    const err = new Error("Token không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const invitation = await Invitation.findOne({
    token,
    token_expires: { $gt: new Date() },
    status: "pending",
  });

  if (!invitation) {
    const err = new Error("Lời mời không hợp lệ hoặc đã hết hạn");
    err.statusCode = 400;
    throw err;
  }

  // Tìm user theo email
  const user = await User.findOne({ email: invitation.email });
  if (!user) {
    // Chưa có tài khoản → trả về để frontend redirect đăng ký
    return {
      needsRegistration: true,
      email: invitation.email,
      contest_id: invitation.contest_id,
    };
  }

  // Gán role mentor nếu chưa có
  const hasMentorRole = user.roles.some((r) => r.role_name === "mentor");
  if (!hasMentorRole) {
    user.roles.push({
      role_id: new mongoose.Types.ObjectId(),
      role_name: "mentor",
    });
    await user.save();
  }

  // Đánh dấu invitation đã accepted
  invitation.status = "accepted";
  invitation.token = null;
  invitation.token_expires = null;
  invitation.accepted_at = new Date();
  await invitation.save();

  return {
    needsRegistration: false,
    user: {
      _id: user._id,
      full_name: user.full_name,
      email: user.email,
      roles: user.roles,
    },
    contest_id: invitation.contest_id,
  };
};

// ─── declineInvitation ───────────────────────────────────────────────────────

/**
 * Mentor/Judge từ chối lời mời. Thông báo cho admin (người đã mời) qua in-app + email.
 */
export const declineInvitation = async (token, { reason } = {}) => {
  if (!token) {
    const err = new Error("Token không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const invitation = await Invitation.findOne({
    token,
    token_expires: { $gt: new Date() },
    status: "pending",
  }).populate("contest_id", "title").populate("invited_by", "full_name email");

  if (!invitation) {
    const err = new Error("Lời mời không hợp lệ hoặc đã hết hạn");
    err.statusCode = 400;
    throw err;
  }

  invitation.status = "declined";
  invitation.token = null;
  invitation.token_expires = null;
  await invitation.save();

  // Đồng bộ: xóa luôn JudgeAssignment "Chờ xác nhận" gắn với lời mời này,
  // nếu không nó sẽ đứng yên ở invitation_status="pending_invite" mãi mãi
  // dù Invitation đã chuyển sang "declined" — khiến UI vẫn hiện "Chờ xác nhận".
  if (invitation.role === "judge") {
    await JudgeAssignment.deleteOne({ invitation_id: invitation._id, invitation_status: "pending_invite" });
  }

  const roleLabel = invitation.role === "judge" ? "Giám khảo" : "Mentor";
  const contestTitle = invitation.contest_id?.title || "cuộc thi";
  const reasonText = reason && reason.trim() ? ` Lý do: ${reason.trim()}` : "";

  if (invitation.invited_by) {
    createNotification({
      user_id: invitation.invited_by._id,
      type: "general",
      title: `Lời mời ${roleLabel} đã bị từ chối`,
      message: `${invitation.email} đã từ chối lời mời làm ${roleLabel} cho cuộc thi "${contestTitle}".${reasonText}`,
      ref_id: invitation.contest_id?._id || null,
      ref_type: "Contest",
    }).catch((e) => console.error("[declineInvitation notify]", e));

    if (invitation.invited_by.email) {
      sendCustomEmail(
        invitation.invited_by.email,
        `[SEAL Hackathon] ${invitation.email} đã từ chối lời mời ${roleLabel}`,
        `<p>Xin chào,</p>
         <p><strong>${invitation.email}</strong> đã <strong>từ chối</strong> lời mời tham gia làm <strong>${roleLabel}</strong> cho cuộc thi <strong>${contestTitle}</strong>.${reasonText}</p>
         <p>Vui lòng tìm ${roleLabel.toLowerCase()} khác nếu cần.</p>
         <p>Trân trọng,<br/>Hệ thống SEAL Hackathon</p>`
      ).catch((e) => console.error("[declineInvitation email]", e));
    }
  }
};

// ─── cancelInvitation ────────────────────────────────────────────────────────

/**
 * Admin huỷ lời mời đã gửi.
 */
export const cancelInvitation = async (invitationId, adminId) => {
  if (!mongoose.Types.ObjectId.isValid(invitationId)) {
    const err = new Error("Invitation ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    const err = new Error("Không tìm thấy lời mời");
    err.statusCode = 404;
    throw err;
  }

  if (invitation.invited_by.toString() !== adminId.toString()) {
    const err = new Error("Bạn không có quyền huỷ lời mời này");
    err.statusCode = 403;
    throw err;
  }

  if (invitation.status === "accepted") {
    const err = new Error("Không thể huỷ lời mời đã được chấp nhận");
    err.statusCode = 400;
    throw err;
  }

  invitation.status = "cancelled";
  invitation.token = null;
  invitation.token_expires = null;
  await invitation.save();
};

// ─── getInvitationsByContest ─────────────────────────────────────────────────

/**
 * Lấy danh sách lời mời của một contest, hỗ trợ filter status.
 */
export const getInvitationsByContest = async (contestId, { status } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(contestId)) {
    const err = new Error("Contest ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const query = { contest_id: contestId };
  if (status) query.status = status;

  return Invitation.find(query)
    .populate("invited_by", "full_name email")
    .sort({ created_at: -1 });
};

// ─── getInvitationByToken ────────────────────────────────────────────────────

/**
 * Lấy thông tin lời mời theo token (để frontend hiển thị trước khi accept).
 */
export const getInvitationByToken = async (token) => {
  const invitation = await Invitation.findOne({
    token,
    token_expires: { $gt: new Date() },
    status: "pending",
  }).populate("contest_id", "title description start_date end_date");

  if (!invitation) {
    const err = new Error("Lời mời không hợp lệ hoặc đã hết hạn");
    err.statusCode = 400;
    throw err;
  }

  return invitation;
};

// ─── completeJudgeRegistration ───────────────────────────────────────────────

/**
 * Judge chấp nhận lời mời (nút "Chấp nhận" trên trang xác nhận lời mời):
 * - Nếu email đã có tài khoản nội bộ → chỉ gán thêm role judge.
 * - Nếu chưa có tài khoản → tự tạo tài khoản với mật khẩu ngẫu nhiên, gửi email
 *   kèm link đặt lại mật khẩu lần đầu (tái dùng cơ chế reset_token có sẵn).
 * Cập nhật JudgeAssignment.judge_id và đánh dấu invitation accepted.
 */
export const completeJudgeRegistration = async ({ token, full_name }) => {
  if (!token) {
    const err = new Error("Token không hợp lệ"); err.statusCode = 400; throw err;
  }

  const invitation = await Invitation.findOne({
    token,
    token_expires: { $gt: new Date() },
    status: "pending",
    role: "judge",
  });
  if (!invitation) {
    const err = new Error("Lời mời không hợp lệ hoặc đã hết hạn"); err.statusCode = 400; throw err;
  }

  const resolvedFullName = (full_name && full_name.trim()) || invitation.email.split("@")[0];

  // Kiểm tra email đã có tài khoản chưa
  let user = await User.findOne({ email: invitation.email });
  let isNewAccount = false;
  if (user) {
    // Đã có tài khoản → gán thêm role judge nếu chưa có
    const hasJudge = user.roles.some(r => r.role_name === "judge");
    if (!hasJudge) {
      user.roles.push({ role_id: new mongoose.Types.ObjectId(), role_name: "judge" });
      await user.save();
    }
  } else {
    // Chưa có tài khoản → tự tạo với mật khẩu ngẫu nhiên, judge sẽ đặt lại qua email
    isNewAccount = true;
    const randomPassword = crypto.randomBytes(16).toString("hex");
    try {
      const password_hash = await bcrypt.hash(randomPassword, 10);
      user = await User.create({
        full_name: resolvedFullName,
        email: invitation.email,
        password_hash,
        provider: "local",
        is_verified: true,
        roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "judge" }],
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        // Nếu bị trùng do race condition, lấy lại user đã được tạo
        isNewAccount = false;
        user = await User.findOne({ email: invitation.email });
        if (!user) throw createErr;
        const hasJudge = user.roles.some(r => r.role_name === "judge");
        if (!hasJudge) {
          user.roles.push({ role_id: new mongoose.Types.ObjectId(), role_name: "judge" });
          await user.save();
        }
      } else {
        throw createErr;
      }
    }
  }

  if (isNewAccount) {
    // Cấp sẵn reset_token để judge đặt mật khẩu lần đầu qua email, không cần biết mật khẩu ngẫu nhiên
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.reset_token = resetToken;
    user.reset_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await user.save();
    sendPasswordResetEmail(user.email, resetToken).catch((e) =>
      console.error("[completeJudgeRegistration sendPasswordResetEmail]", e)
    );
  }

  // Cập nhật tất cả JudgeAssignment pending của invitation này
  await JudgeAssignment.updateMany(
    { invitation_id: invitation._id },
    { $set: { judge_id: user._id, invitation_status: "active" } }
  );

  // Đánh dấu invitation accepted
  invitation.status = "accepted";
  invitation.token = null;
  invitation.token_expires = null;
  invitation.accepted_at = new Date();
  await invitation.save();

  // Tìm các phân công vừa được kích hoạt để gửi thông báo in-app cho Giám khảo ngoại
  try {
    const activatedAssignments = await JudgeAssignment.find({
      invitation_id: invitation._id,
    })
      .populate("contest_id", "title")
      .populate("pool_id", "pool_name");

    for (const assign of activatedAssignments) {
      const contestTitle = assign.contest_id?.title || "Cuộc thi";
      const poolName = assign.pool_id?.pool_name || "Bảng đấu";
      await notifyJudgeAssignedToPool({
        user_id: user._id,
        contestTitle,
        poolName,
        ref_id: assign.contest_id?._id || null,
      });
    }
  } catch (notifErr) {
    console.error("[completeJudgeRegistration notification error]", notifErr);
  }

  return { user: { _id: user._id, full_name: user.full_name, email: user.email }, isNewAccount };
};
