import express from "express";
import { handleCreateScore, handleUpdateScore, handleGetProgress, handleGetMyScores, handleGetJudgeSchedule, handleGetScoresByRound } from "../controllers/scoreController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authenticate, authorize("mentor", "judge"), handleCreateScore);
router.put("/:id", authenticate, authorize("mentor", "judge"), handleUpdateScore);
router.get(
  "/contests/:contestId/rounds/:roundId/progress",
  authenticate, authorize("admin", "mentor", "judge"),
  handleGetProgress
);

router.get(
  "/contests/:contestId/rounds/:roundId/my-scores",
  authenticate, authorize("admin", "mentor", "judge"),
  handleGetMyScores
);

// Mentors can be assigned as INTERNAL judges for a pool, so they must be able to
// read their own schedule. The handler scopes the query to req.user's assignment.
router.get(
  "/contests/:contestId/rounds/:roundId/judge-schedule",
  authenticate, authorize("judge", "mentor"),
  handleGetJudgeSchedule
);

router.get(
  "/contests/:contestId/rounds/:roundId/all-scores",
  authenticate, authorize("admin"),
  handleGetScoresByRound
);

export default router;
