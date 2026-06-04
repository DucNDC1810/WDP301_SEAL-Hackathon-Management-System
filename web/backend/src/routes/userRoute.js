import express from "express";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import {
  getMe,
  getAllUsers,
  assignRole,
  removeRole,
  getUserByIdHandler,
  updateProfileHandler,
  changePasswordHandler,
} from "../controllers/userController.js";

const router = express.Router();

// ─── authenticated routes ───────────────────────────────────────────────────

// GET   /api/users/me          — lấy thông tin bản thân
router.get("/me", authenticate, getMe);

// PATCH /api/users/me          — cập nhật thông tin cá nhân
router.patch("/me", authenticate, updateProfileHandler);

// PATCH /api/users/me/password — đổi mật khẩu
router.patch("/me/password", authenticate, changePasswordHandler);

// ─── admin-only routes ──────────────────────────────────────────────────────

// GET    /api/users              — danh sách tất cả users
router.get("/", authenticate, authorize("admin"), getAllUsers);

// GET    /api/users/:id          — lấy user theo ID
router.get("/:id", authenticate, authorize("admin"), getUserByIdHandler);

// PUT    /api/users/:id/roles    — gán role cho user
router.put("/:id/roles", authenticate, authorize("admin"), assignRole);

// DELETE /api/users/:id/roles/:role_name — xóa role của user
router.delete("/:id/roles/:role_name", authenticate, authorize("admin"), removeRole);

export default router;
