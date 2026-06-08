import express from "express";
import {
  signUp,
  signIn,
  signOut,
  refresh,
  getMe,
  verifyEmailHandler,
  resendVerification,
  forgotPasswordHandler,
  resetPasswordHandler,
  completeProfileHandler,
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/auth/signup                — đăng ký
router.post("/signup", signUp);

// POST /api/auth/signin                — đăng nhập
router.post("/signin", signIn);

// POST /api/auth/signout               — đăng xuất
router.post("/signout", signOut);

// POST /api/auth/refresh               — làm mới access token
router.post("/refresh", refresh);

// GET  /api/auth/me                    — thông tin user hiện tại
router.get("/me", authenticate, getMe);

// GET  /api/auth/verify-email?token=   — xác nhận email
router.get("/verify-email", verifyEmailHandler);

// POST /api/auth/resend-verification   — gửi lại email xác nhận
router.post("/resend-verification", resendVerification);

// POST /api/auth/forgot-password       — quên mật khẩu
router.post("/forgot-password", forgotPasswordHandler);

// POST /api/auth/reset-password        — đặt lại mật khẩu
router.post("/reset-password", resetPasswordHandler);

// POST /api/auth/complete-profile      — hoàn chỉnh profile sau OAuth lần đầu
router.post("/complete-profile", authenticate, completeProfileHandler);

export default router;
