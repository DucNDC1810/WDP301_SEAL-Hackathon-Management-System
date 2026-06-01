import express from "express";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import {
  getMe,
  getAllUsers,
  assignRole,
  removeRole,
  updateGithub,
} from "../controllers/userController.js";

const router = express.Router();

// ─── authenticated routes ───────────────────────────────────────────────────

// GET /api/users/me — lấy thông tin bản thân
router.get("/me", authenticate, getMe);

// PUT /api/users/me/github — cập nhật thông tin GitHub
router.put("/me/github", authenticate, updateGithub);

// ─── admin-only routes ──────────────────────────────────────────────────────

// GET    /api/users              — danh sách tất cả users
router.get("/", authenticate, authorize("admin"), getAllUsers);

// PUT    /api/users/:id/roles    — gán role cho user
router.put("/:id/roles", authenticate, authorize("admin"), assignRole);

// DELETE /api/users/:id/roles/:role_name — xóa role của user
router.delete("/:id/roles/:role_name", authenticate, authorize("admin"), removeRole);

export default router;
