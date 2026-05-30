import express from "express";
import {
  signUp,
  signIn,
  signOut,
  refresh,
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

export default router;
