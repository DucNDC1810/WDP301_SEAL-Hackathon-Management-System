import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/authMiddleware.js";
import {
  handleSubmit,
  handleListSubmissions,
  handleReviewSubmission,
  handleGetCommitCount,
  handleGetRecentCommits,
} from "../controllers/submissionController.js";

const router = Router();

// POST /api/submissions - Nộp bài
router.post("/", authenticate, handleSubmit);

// GET /api/submissions - Xem danh sách bài nộp
router.get("/", authenticate, handleListSubmissions);

// PATCH /api/submissions/:id/review - Duyệt bài nộp muộn (COORDINATOR/admin only)
router.patch("/:id/review", authenticate, requireRole("admin"), handleReviewSubmission);

// GET /api/submissions/:id/commit-count - Đếm số commit của repo GitHub (admin only)
router.get("/:id/commit-count", authenticate, requireRole("admin"), handleGetCommitCount);

// GET /api/submissions/:id/commits - Danh sách commit gần nhất của repo GitHub (admin only)
router.get("/:id/commits", authenticate, requireRole("admin"), handleGetRecentCommits);

export default router;
