import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/authMiddleware.js";
import { audit } from "../middlewares/auditMiddleware.js";
import { activate, deactivate, lock, getStatus, releaseProblem, judgeCompletion } from "../controllers/roundController.js";

const router = Router({ mergeParams: true }); // mergeParams để nhận contestId từ parent

// GET /api/contests/:contestId/rounds/:roundId/status
router.get("/:roundId/status", authenticate, getStatus);

// POST /api/contests/:contestId/rounds/:roundId/activate
router.post(
  "/:roundId/activate",
  authenticate,
  requireRole("admin"),
  audit("Round", "ACTIVATE"),
  activate
);

// POST /api/contests/:contestId/rounds/:roundId/deactivate
router.post(
  "/:roundId/deactivate",
  authenticate,
  requireRole("admin"),
  audit("Round", "DEACTIVATE"),
  deactivate
);

// POST /api/contests/:contestId/rounds/:roundId/lock-scoring
router.post(
  "/:roundId/lock-scoring",
  authenticate,
  requireRole("admin"),
  audit("Round", "LOCK_SCORING"),
  lock
);

// POST /api/contests/:contestId/rounds/:roundId/release-problem
router.post(
  "/:roundId/release-problem",
  authenticate,
  requireRole("admin"),
  audit("Round", "RELEASE_PROBLEM"),
  releaseProblem
);

// GET /api/contests/:contestId/rounds/:roundId/judge-completion
router.get(
  "/:roundId/judge-completion",
  authenticate,
  requireRole("admin"),
  judgeCompletion
);

export default router;
