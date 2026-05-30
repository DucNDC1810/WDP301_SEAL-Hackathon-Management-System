import mongoose from "mongoose";
import User from "../models/User.js";

const VALID_ROLES = ["admin", "mentor", "contestant"];

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
