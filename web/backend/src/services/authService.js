import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Role from "../models/Role.js";
import UserRole from "../models/UserRole.js";
import TeamMember from "../models/TeamMember.js";
import {
  generateVerificationCode,
  sendVerificationEmail,
} from "./emailService.js";

// ─── helpers ────────────────────────────────────────────────────────────────

const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
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

  // create user
  const newUser = new User({
    full_name,
    email,
    password_hash,
    phone: phone || "",
    provider: "local",
  });
  await newUser.save();

  // assign default role "contestant"
  let contestantRole = await Role.findOne({ role_name: "contestant" });
  if (!contestantRole) {
    contestantRole = new Role({ role_name: "contestant" });
    await contestantRole.save();
  }
  await UserRole.create({ user_id: newUser._id, role_id: contestantRole._id });

  // trả về user không có password_hash
  const user = newUser.toObject();
  delete user.password_hash;
  return user;
};

// ─── signIn ─────────────────────────────────────────────────────────────────

/**
 * Xác thực user bằng email + password.
 * @returns {{ user, accessToken, refreshToken }}
 * @throws {Error} nếu sai credentials
 */
export const authenticateUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() });
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

  // Fetch roles from UserRole
  const userRolesList = await UserRole.find({ user_id: user._id }).populate("role_id");
  const roles = userRolesList.map((ur) => ({
    role_id: ur.role_id._id,
    role_name: ur.role_id.role_name,
  }));

  // Check if user is in any team
  const teamMembership = await TeamMember.findOne({
    user_id: user._id,
  }).populate("team_id");

  return {
    user: {
      _id: user._id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified,
      roles,
      team: teamMembership
        ? {
            _id: teamMembership.team_id._id,
            team_name: teamMembership.team_id.team_name,
            is_leader: teamMembership.is_leader,
          }
        : null,
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
  });
  await newUser.save();

  // assign default role "contestant"
  let contestantRole = await Role.findOne({ role_name: "contestant" });
  if (!contestantRole) {
    contestantRole = new Role({ role_name: "contestant" });
    await contestantRole.save();
  }
  await UserRole.create({ user_id: newUser._id, role_id: contestantRole._id });

  return newUser;
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

  const user = await User.findById(payload.id).select("-password_hash");
  if (!user) {
    const err = new Error("Người dùng không tồn tại");
    err.statusCode = 403;
    throw err;
  }

  return generateAccessToken(user._id);
};

// ─── Email Verification ─────────────────────────────────────────────────────

/**
 * Admin gửi mã xác nhận email cho user (contestant)
 * @param {string} userId - ID của user cần xác nhận
 * @returns {Object} { success: true }
 * @throws {Error} nếu user không tồn tại hoặc email service lỗi
 */
export const sendVerificationCodeToUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("Người dùng không tồn tại");
    err.statusCode = 404;
    throw err;
  }

  if (user.is_verified) {
    const err = new Error("Email của user này đã được xác thực");
    err.statusCode = 400;
    throw err;
  }

  // Generate verification code
  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  // Save code to database
  user.verification_code = verificationCode;
  user.verification_code_expires_at = expiresAt;
  await user.save();

  // Send email
  await sendVerificationEmail(user.email, user.full_name, verificationCode);

  return {
    success: true,
    message: "Mã xác thực đã được gửi tới email của user",
  };
};

/**
 * Contestant xác nhận email bằng mã xác thực
 * @param {string} userId - ID của user
 * @param {string} verificationCode - mã xác thực 6 chữ số
 * @returns {Object} user document
 * @throws {Error} nếu mã không hợp lệ hoặc hết hạn
 */
export const verifyUserEmail = async (userId, verificationCode) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("Người dùng không tồn tại");
    err.statusCode = 404;
    throw err;
  }

  if (user.is_verified) {
    const err = new Error("Email của user này đã được xác thực");
    err.statusCode = 400;
    throw err;
  }

  // Check if code exists
  if (!user.verification_code) {
    const err = new Error("Chưa có mã xác thực nào được gửi");
    err.statusCode = 400;
    throw err;
  }

  // Check if code is expired
  if (new Date() > user.verification_code_expires_at) {
    const err = new Error("Mã xác thực đã hết hạn");
    err.statusCode = 400;
    throw err;
  }

  // Check if code matches
  if (user.verification_code !== verificationCode) {
    const err = new Error("Mã xác thực không đúng");
    err.statusCode = 400;
    throw err;
  }

  // Mark email as verified
  user.is_verified = true;
  user.verification_code = null;
  user.verification_code_expires_at = null;
  await user.save();

  // Return user without password hash
  const verifiedUser = user.toObject();
  delete verifiedUser.password_hash;
  return verifiedUser;
};
