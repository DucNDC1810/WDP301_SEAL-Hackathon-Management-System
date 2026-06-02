import express from "express";
import {
  signUp,
  signIn,
  signOut,
  refresh,
  getMe,
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/auth/signup   — đăng ký
router.post("/signup", signUp);

// POST /api/auth/signin   — đăng nhập
router.post("/signin", signIn);

// POST /api/auth/signout  — đăng xuất
router.post("/signout", signOut);

// POST /api/auth/refresh  — làm mới access token
router.post("/refresh", refresh);

// GET /api/auth/me        — thông tin user hiện tại
router.get("/me", authenticate, getMe);

export default router;
