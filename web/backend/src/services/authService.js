import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "./emailService.js";

// ─── helpers ────────────────────────────────────────────────────────────────

const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "7d",
  });

const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });

// ─── signUp ─────────────────────────────────────────────────────────────────

/**
 * Tạo user mới với role "contestant" mặc định.
 * @returns {Object} user document (không có password_hash)
 * @throws {Error} với message nếu email trùng
 */
export const createUser = async ({ full_name, email, password, phone }) => {
  // check duplicate
  const duplicate = await User.findOne({ email: email.toLowerCase() });
  if (duplicate) {
    const err = new Error("Email đã tồn tại");
    err.statusCode = 409;
    throw err;
  }

  // hash password
  const password_hash = await bcrypt.hash(password, 10);

  // generate email verification token
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  // create user — tự động gán role "contestant"
  const newUser = new User({
    full_name,
    email,
    password_hash,
    phone: phone || "",
    provider: "local",
    is_verified: false,
    verify_token: verifyToken,
    verify_token_expires: verifyTokenExpires,
    roles: [
      {
        role_id: new mongoose.Types.ObjectId(),
        role_name: "contestant",
      },
    ],
  });
  await newUser.save();

  // gửi email xác nhận (không throw nếu lỗi để tránh rollback)
  sendVerificationEmail(email, verifyToken).catch((err) =>
    console.error("[sendVerificationEmail]", err)
  );

  // trả về user không có thông tin nhạy cảm
  const user = newUser.toObject();
  delete user.password_hash;
  delete user.verify_token;
  delete user.verify_token_expires;
  delete user.reset_token;
  delete user.reset_token_expires;
  return user;
};

// ─── signIn ─────────────────────────────────────────────────────────────────

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Xác thực user bằng email hoặc username + password.
 * @returns {{ user, accessToken, refreshToken }}
 * @throws {Error} nếu sai credentials
 */
export const authenticateUser = async ({ identifier, password }) => {
  const normalizedIdentifier = identifier.trim();
  const normalizedEmail = normalizedIdentifier.toLowerCase();

  const user = await User.findOne({
    $or: [
      { email: normalizedEmail },
      { full_name: new RegExp(`^${escapeRegExp(normalizedIdentifier)}$`, "i") },
    ],
  });
  if (!user) {
    const err = new Error("Email hoặc mật khẩu không đúng");
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const err = new Error("Email hoặc mật khẩu không đúng");
    err.statusCode = 401;
    throw err;
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  return {
    user: {
      _id: user._id,
      full_name: user.full_name,
      email: user.email,
      avatar_url: user.avatar_url,
      roles: user.roles,
    },
    accessToken,
    refreshToken,
  };
};

// ─── OAuth ──────────────────────────────────────────────────────────────────

/**
 * Tìm hoặc tạo user từ OAuth provider (Google / GitHub).
 * @returns {Object} user document
 */
export const findOrCreateOAuthUser = async ({
  provider,
  provider_id,
  email,
  full_name,
  avatar_url,
}) => {
  // 1. Tìm theo provider + provider_id
  let user = await User.findOne({ provider, provider_id });
  if (user) return user;

  // 2. Tìm theo email → link tài khoản
  user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    user.provider = provider;
    user.provider_id = provider_id;
    if (avatar_url) user.avatar_url = avatar_url;
    await user.save();
    return user;
  }

  // 3. Tạo user mới
  const newUser = new User({
    full_name,
    email: email.toLowerCase(),
    provider,
    provider_id,
    avatar_url: avatar_url || "",
    is_verified: true,
    roles: [
      {
        role_id: new mongoose.Types.ObjectId(),
        role_name: "contestant",
      },
    ],
  });
  await newUser.save();
  return newUser;
};

// ─── verifyEmail ────────────────────────────────────────────────────────────

/**
 * Xác nhận email bằng token.
 * @throws {Error} nếu token không hợp lệ hoặc đã hết hạn
 */
export const verifyEmail = async (token) => {
  if (!token) {
    const err = new Error("Token xác nhận không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({
    verify_token: token,
    verify_token_expires: { $gt: new Date() },
  });

  if (!user) {
    const err = new Error("Token xác nhận không hợp lệ hoặc đã hết hạn");
    err.statusCode = 400;
    throw err;
  }

  user.is_verified = true;
  user.verify_token = null;
  user.verify_token_expires = null;
  await user.save();
};

// ─── resendVerificationEmail ─────────────────────────────────────────────────

/**
 * Gửi lại email xác nhận.
 * @throws {Error} nếu email không tồn tại hoặc đã xác nhận rồi
 */
export const resendVerificationEmail = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const err = new Error("Email không tồn tại trong hệ thống");
    err.statusCode = 404;
    throw err;
  }

  if (user.is_verified) {
    const err = new Error("Email này đã được xác nhận");
    err.statusCode = 409;
    throw err;
  }

  const verifyToken = crypto.randomBytes(32).toString("hex");
  user.verify_token = verifyToken;
  user.verify_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  await sendVerificationEmail(email, verifyToken);
};

// ─── forgotPassword ──────────────────────────────────────────────────────────

/**
 * Gửi email reset mật khẩu.
 * Luôn trả về thành công để tránh lộ thông tin user.
 */
export const forgotPassword = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.provider !== "local") return;

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.reset_token = resetToken;
  user.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
  await user.save();

  sendPasswordResetEmail(email, resetToken).catch((err) =>
    console.error("[sendPasswordResetEmail]", err)
  );
};

// ─── resetPassword ───────────────────────────────────────────────────────────

/**
 * Đặt lại mật khẩu bằng reset token.
 * @throws {Error} nếu token không hợp lệ hoặc đã hết hạn
 */
export const resetPassword = async (token, newPassword) => {
  if (!token || !newPassword) {
    const err = new Error("Token và mật khẩu mới là bắt buộc");
    err.statusCode = 400;
    throw err;
  }

  if (newPassword.length < 6) {
    const err = new Error("Mật khẩu phải có ít nhất 6 ký tự");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({
    reset_token: token,
    reset_token_expires: { $gt: new Date() },
  });

  if (!user) {
    const err = new Error("Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
    err.statusCode = 400;
    throw err;
  }

  user.password_hash = await bcrypt.hash(newPassword, 10);
  user.reset_token = null;
  user.reset_token_expires = null;
  await user.save();
};

// ─── refresh ────────────────────────────────────────────────────────────────

/**
 * Xác thực refresh token và phát access token mới.
 * @returns {string} new accessToken
 * @throws {Error} nếu token không hợp lệ hoặc user không tồn tại
 */
export const refreshAccessToken = async (token) => {
  if (!token) {
    const err = new Error("Không tìm thấy refresh token");
    err.statusCode = 401;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    const err = new Error("Refresh token không hợp lệ hoặc đã hết hạn");
    err.statusCode = 403;
    throw err;
  }

  const user = await User.findById(payload.id).select(
    "-password_hash -verify_token -verify_token_expires -reset_token -reset_token_expires"
  );
  if (!user) {
    const err = new Error("Người dùng không tồn tại");
    err.statusCode = 403;
    throw err;
  }

  return generateAccessToken(user._id);
};
