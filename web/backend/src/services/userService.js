import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../models/User.js";

const VALID_ROLES = ["admin", "mentor", "contestant"];
const FPT_EMAIL_DOMAINS = ["@fpt.edu.vn", "@fe.edu.vn", "@fpt.com.vn"];

// ─── getUserById ────────────────────────────────────────────────────────────

/**
 * Lấy user theo ID (không trả password_hash).
 */
export const getUserById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("User ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(id).select("-password_hash");
  if (!user) {
    const err = new Error("Không tìm thấy user");
    err.statusCode = 404;
    throw err;
  }

  return user;
};

// ─── getAllUsers ─────────────────────────────────────────────────────────────

/**
 * Lấy danh sách tất cả users.
 */
export const getAllUsers = async () => {
  return User.find().select("-password_hash").sort({ created_at: -1 });
};

// ─── assignRole ─────────────────────────────────────────────────────────────

/**
 * Gán role cho user.
 * @throws {Error} nếu role không hợp lệ, user không tồn tại, hoặc đã có role
 */
export const assignRoleToUser = async (userId, role_name) => {
  // validate role
  if (!role_name || !VALID_ROLES.includes(role_name)) {
    const err = new Error(
      `role_name không hợp lệ. Chỉ chấp nhận: ${VALID_ROLES.join(", ")}`
    );
    err.statusCode = 400;
    throw err;
  }

  // validate & find user
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error("User ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("Không tìm thấy user");
    err.statusCode = 404;
    throw err;
  }

  // FPT email validation cho mentor
  if (role_name === "mentor") {
    const isFptEmail = FPT_EMAIL_DOMAINS.some((domain) =>
      user.email.endsWith(domain)
    );
    if (!isFptEmail) {
      const err = new Error(
        `Chỉ tài khoản có email FPT (${FPT_EMAIL_DOMAINS.join(", ")}) mới được gán role mentor`
      );
      err.statusCode = 403;
      throw err;
    }
  }

  // check duplicate role
  const hasRole = user.roles.some((r) => r.role_name === role_name);
  if (hasRole) {
    const err = new Error(`User đã có role "${role_name}"`);
    err.statusCode = 409;
    throw err;
  }

  // add role & save
  user.roles.push({
    role_id: new mongoose.Types.ObjectId(),
    role_name,
  });
  await user.save();

  return User.findById(userId).select("-password_hash");
};

// ─── removeRole ─────────────────────────────────────────────────────────────

/**
 * Xóa role khỏi user.
 * @throws {Error} nếu user không có role đó hoặc là role cuối cùng
 */
export const removeRoleFromUser = async (userId, role_name) => {
  // validate
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error("User ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  if (!VALID_ROLES.includes(role_name)) {
    const err = new Error(
      `role_name không hợp lệ. Chỉ chấp nhận: ${VALID_ROLES.join(", ")}`
    );
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("Không tìm thấy user");
    err.statusCode = 404;
    throw err;
  }

  const roleIndex = user.roles.findIndex((r) => r.role_name === role_name);
  if (roleIndex === -1) {
    const err = new Error(`User không có role "${role_name}"`);
    err.statusCode = 404;
    throw err;
  }

  if (user.roles.length === 1) {
    const err = new Error("Không thể xóa role cuối cùng của user");
    err.statusCode = 400;
    throw err;
  }

  user.roles.splice(roleIndex, 1);
  await user.save();

  return User.findById(userId).select("-password_hash");
};

// ─── updateProfile ───────────────────────────────────────────────────────────

/**
 * Cập nhật thông tin cá nhân của user.
 * Chỉ cho phép sửa full_name, phone, avatar_url.
 */
export const updateProfile = async (userId, { full_name, phone, avatar_url }) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error("User ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("Không tìm thấy user");
    err.statusCode = 404;
    throw err;
  }

  if (full_name !== undefined) user.full_name = full_name.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (avatar_url !== undefined) user.avatar_url = avatar_url.trim();

  await user.save();
  return User.findById(userId).select("-password_hash");
};

// ─── changePassword ──────────────────────────────────────────────────────────

/**
 * Đổi mật khẩu cho user đang đăng nhập.
 * Chỉ áp dụng cho tài khoản local (không phải OAuth).
 */
export const changePassword = async (userId, { current_password, new_password }) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error("User ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  if (!current_password || !new_password) {
    const err = new Error("Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới");
    err.statusCode = 400;
    throw err;
  }

  if (new_password.length < 6) {
    const err = new Error("Mật khẩu mới phải có ít nhất 6 ký tự");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("Không tìm thấy user");
    err.statusCode = 404;
    throw err;
  }

  if (user.provider !== "local" || !user.password_hash) {
    const err = new Error("Tài khoản OAuth không hỗ trợ đổi mật khẩu");
    err.statusCode = 400;
    throw err;
  }

  const isMatch = await bcrypt.compare(current_password, user.password_hash);
  if (!isMatch) {
    const err = new Error("Mật khẩu hiện tại không đúng");
    err.statusCode = 401;
    throw err;
  }

  user.password_hash = await bcrypt.hash(new_password, 10);
  await user.save();
};
