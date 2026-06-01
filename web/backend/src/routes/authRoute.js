import express from "express";
import {
  signUp,
  signIn,
  signOut,
  refresh,
  sendVerificationCode,
  verifyEmail,
} from "../controllers/authController.js";

const router = express.Router();

// POST /api/auth/signup   — đăng ký
router.post("/signup", signUp);

// POST /api/auth/signin   — đăng nhập
router.post("/signin", signIn);

// POST /api/auth/signout  — đăng xuất
router.post("/signout", signOut);

// POST /api/auth/refresh  — làm mới access token
router.post("/refresh", refresh);

// POST /api/auth/send-verification-code  — admin gửi mã xác thực
router.post("/send-verification-code", sendVerificationCode);

// POST /api/auth/verify-email  — contestant xác thực email
router.post("/verify-email", verifyEmail);

export default router;
