import crypto from "crypto";
import mongoose from "mongoose";
import Invitation from "../models/Invitation.js";
import Contest from "../models/Contest.js";
import User from "../models/User.js";
import { sendInvitationEmail } from "./emailService.js";

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
    if (existing.status === "pending") {
      // Tái sử dụng — cấp token mới và gửi lại
      const rawToken = crypto.randomBytes(32).toString("hex");
      existing.token = rawToken;
      existing.token_expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      existing.status = "pending";
      await existing.save();

      sendInvitationEmail(emailLower, contest.title, rawToken).catch((err) =>
        console.error("[sendInvitationEmail resend]", err)
      );
      return existing;
    }
    // cancelled / expired / declined → tạo lại
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

  sendInvitationEmail(emailLower, contest.title, rawToken).catch((err) =>
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
 * Mentor từ chối lời mời.
 */
export const declineInvitation = async (token) => {
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

  invitation.status = "declined";
  invitation.token = null;
  invitation.token_expires = null;
  await invitation.save();
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
