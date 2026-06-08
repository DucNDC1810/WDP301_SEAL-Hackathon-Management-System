import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/authMiddleware.js";
import {
  handleSubmit,
  handleListSubmissions,
  handleReviewSubmission,
} from "../controllers/submissionController.js";

const router = Router();

// POST /api/submissions - Nộp bài
router.post("/", authenticate, handleSubmit);

// GET /api/submissions - Xem danh sách bài nộp
router.get("/", authenticate, handleListSubmissions);

// PATCH /api/submissions/:id/review - Duyệt bài nộp muộn (COORDINATOR/admin only)
router.patch("/:id/review", authenticate, requireRole("admin"), handleReviewSubmission);

export default router;
