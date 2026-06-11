import express from "express";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import { audit } from "../middlewares/auditMiddleware.js";
import {
  getMe,
  getAllUsers,
  assignRole,
  removeRole,
  getUserByIdHandler,
  updateProfileHandler,
  changePasswordHandler,
  deleteUserHandler,
  submitVerifyRequest,
  getPendingVerifications,
  reviewVerifyRequest,
} from "../controllers/userController.js";

const router = express.Router();

// ─── authenticated routes ───────────────────────────────────────────────────

// GET   /api/users/me          — lấy thông tin bản thân
router.get("/me", authenticate, getMe);

// PATCH /api/users/me          — cập nhật thông tin cá nhân
router.patch("/me", authenticate, updateProfileHandler);

// PATCH /api/users/me/password — đổi mật khẩu
router.patch("/me/password", authenticate, changePasswordHandler);

// POST /api/users/me/verify-request — student gửi yêu cầu xác thực
router.post("/me/verify-request", authenticate, submitVerifyRequest);

// ─── admin-only routes ──────────────────────────────────────────────────────

// GET  /api/users/verifications — admin lấy danh sách chờ xác thực
router.get("/verifications", authenticate, authorize("admin"), getPendingVerifications);

// GET    /api/users              — danh sách tất cả users
router.get("/", authenticate, authorize("admin"), getAllUsers);

// GET    /api/users/:id          — lấy user theo ID
router.get("/:id", authenticate, authorize("admin"), getUserByIdHandler);

// PATCH /api/users/:id/verify-review — admin duyệt/từ chối xác thực
router.patch("/:id/verify-review", authenticate, authorize("admin"), reviewVerifyRequest);

// PUT    /api/users/:id/roles          — gán role cho user
router.put("/:id/roles", authenticate, authorize("admin"), audit("USER", "ASSIGN_ROLE"), assignRole);

// DELETE /api/users/:id/roles/:role_name — xóa role của user
router.delete("/:id/roles/:role_name", authenticate, authorize("admin"), audit("USER", "REMOVE_ROLE"), removeRole);

// DELETE /api/users/:id                — xóa user
router.delete("/:id", authenticate, authorize("admin"), audit("USER", "DELETE"), deleteUserHandler);

export default router;
