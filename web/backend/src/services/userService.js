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
 * Lấy danh sách users với filter tuỳ chọn.
 * @param {object} options - { role, search, page, limit }
 */
export const getAllUsers = async ({ role, search, page = 1, limit = 20 } = {}) => {
  const query = {};

  if (role) {
    if (!VALID_ROLES.includes(role)) {
      const err = new Error(`role không hợp lệ. Chỉ chấp nhận: ${VALID_ROLES.join(", ")}`);
      err.statusCode = 400;
      throw err;
    }
    query["roles.role_name"] = role;
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { full_name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password_hash -verify_token -verify_token_expires -reset_token -reset_token_expires")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query),
  ]);

  return { users, total, page: Number(page), limit: Number(limit) };
};

// ─── deleteUser ──────────────────────────────────────────────────────────────

/**
 * Xóa user theo ID (admin only).
 * @throws {Error} nếu cố xóa chính mình hoặc user không tồn tại
 */
export const deleteUser = async (userId, requesterId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error("User ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  if (userId === requesterId) {
    const err = new Error("Không thể xóa chính tài khoản của mình");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    const err = new Error("Không tìm thấy user");
    err.statusCode = 404;
    throw err;
  }
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
 * Chỉ cho phép sửa full_name, phone, avatar_url, student_id, student_card.
 */
export const updateProfile = async (userId, { full_name, phone, avatar_url, student_id, student_card }) => {
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

  const { uploadImage } = await import("./cloudinaryService.js");

  if (full_name !== undefined) user.full_name = full_name.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (student_id !== undefined) user.student_id = student_id.trim();

  // Upload avatar to Cloudinary if it is a base64 string
  if (avatar_url !== undefined) {
    if (avatar_url && avatar_url.startsWith("data:image/")) {
      user.avatar_url = await uploadImage(avatar_url, "seal-avatars");
    } else {
      user.avatar_url = avatar_url.trim();
    }
  }

  // Upload student card to Cloudinary if it is a base64 string
  if (student_card !== undefined) {
    if (student_card && student_card.startsWith("data:image/")) {
      user.student_card = await uploadImage(student_card, "student-cards");
    } else {
      user.student_card = student_card.trim();
    }
  }

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
