import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Middleware xác thực JWT access token.
 * Gắn user object vào req.user nếu token hợp lệ.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy access token",
      });
    }

    const token = authHeader.split(" ")[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Access token không hợp lệ hoặc đã hết hạn",
      });
    }

    const user = await User.findById(payload.id).select(
      "-password_hash -verify_token -verify_token_expires -reset_token -reset_token_expires"
    );
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("[authenticate]", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * Middleware kiểm tra role.
 * Sử dụng: authorize("admin", "mentor")
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Chưa xác thực",
      });
    }

    const userRoles = req.user.roles.map((r) => r.role_name);
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập",
      });
    }

    next();
  };
};
