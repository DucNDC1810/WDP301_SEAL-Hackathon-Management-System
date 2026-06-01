import jwt from "jsonwebtoken";
import User from "../models/User.js";
import UserRole from "../models/UserRole.js";

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

    const userDoc = await User.findById(payload.id).select("-password_hash").lean();
    if (!userDoc) {
      return res.status(401).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    // Lấy roles từ UserRole
    const userRolesList = await UserRole.find({ user_id: userDoc._id }).populate("role_id");
    userDoc.roles = userRolesList.map((ur) => ({
      role_id: ur.role_id?._id,
      role_name: ur.role_id?.role_name,
    }));

    req.user = userDoc;
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
