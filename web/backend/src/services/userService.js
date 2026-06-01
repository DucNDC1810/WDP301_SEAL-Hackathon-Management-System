import mongoose from "mongoose";
import User from "../models/User.js";
import Role from "../models/Role.js";
import UserRole from "../models/UserRole.js";

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
  const users = await User.find().select("-password_hash").sort({ created_at: -1 }).lean();
  
  // Attach roles to each user
  for (let i = 0; i < users.length; i++) {
    const userRoles = await UserRole.find({ user_id: users[i]._id }).populate("role_id");
    users[i].roles = userRoles.map((ur) => ({
      role_id: ur.role_id?._id,
      role_name: ur.role_id?.role_name,
    }));
  }
  return users;
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

  // check if role exists in DB
  const role = await Role.findOne({ role_name });
  if (!role) {
    const err = new Error(`Role "${role_name}" không tồn tại trong hệ thống`);
    err.statusCode = 404;
    throw err;
  }

  // check duplicate role
  const hasRole = await UserRole.findOne({ user_id: userId, role_id: role._id });
  if (hasRole) {
    const err = new Error(`User đã có role "${role_name}"`);
    err.statusCode = 409;
    throw err;
  }

  // add role
  await UserRole.create({ user_id: userId, role_id: role._id });

  const updatedUser = await User.findById(userId).select("-password_hash").lean();
  const userRolesList = await UserRole.find({ user_id: userId }).populate("role_id");
  updatedUser.roles = userRolesList.map((ur) => ({
    role_id: ur.role_id._id,
    role_name: ur.role_id.role_name,
  }));

  return updatedUser;
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

  const role = await Role.findOne({ role_name });
  if (!role) {
    const err = new Error(`Role "${role_name}" không tồn tại trong hệ thống`);
    err.statusCode = 404;
    throw err;
  }

  const userRole = await UserRole.findOne({ user_id: userId, role_id: role._id });
  if (!userRole) {
    const err = new Error(`User không có role "${role_name}"`);
    err.statusCode = 404;
    throw err;
  }

  const totalRoles = await UserRole.countDocuments({ user_id: userId });
  if (totalRoles <= 1) {
    const err = new Error("Không thể xóa role cuối cùng của user");
    err.statusCode = 400;
    throw err;
  }

  await UserRole.deleteOne({ _id: userRole._id });

  const updatedUser = await User.findById(userId).select("-password_hash").lean();
  const userRolesList = await UserRole.find({ user_id: userId }).populate("role_id");
  updatedUser.roles = userRolesList.map((ur) => ({
    role_id: ur.role_id._id,
    role_name: ur.role_id.role_name,
  }));

  return updatedUser;
};

// ─── updateGithubInfo ────────────────────────────────────────────────────────

/**
 * Cập nhật thông tin GitHub của user
 */
export const updateGithubInfo = async (userId, github_username, github_link) => {
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

  user.github_username = github_username || "";
  user.github_link = github_link || "";
  await user.save();

  return {
    github_username: user.github_username,
    github_link: user.github_link,
  };
};
