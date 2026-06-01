import express from "express";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import {
  sendVerification,
  verifyEmailHandler,
  onboardingStatus,
} from "../controllers/contestantController.js";

const router = express.Router();

// POST /api/contestants/send-verification — gửi email xác thực (cần đăng nhập)
router.post("/send-verification", authenticate, sendVerification);

// POST /api/contestants/verify-email — xác thực email bằng token (public)
router.post("/verify-email", verifyEmailHandler);

// GET /api/contestants/onboarding — trạng thái onboarding (cần đăng nhập)
router.get(
  "/onboarding",
  authenticate,
  authorize("contestant"),
  onboardingStatus
);

export default router;
