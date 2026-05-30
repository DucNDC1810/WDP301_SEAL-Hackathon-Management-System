import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

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

  // create user — tự động gán role "contestant"
  const newUser = new User({
    full_name,
    email,
    password_hash,
    phone: phone || "",
    provider: "local",
    roles: [
      {
        role_id: new mongoose.Types.ObjectId(),
        role_name: "contestant",
      },
    ],
  });
  await newUser.save();

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
