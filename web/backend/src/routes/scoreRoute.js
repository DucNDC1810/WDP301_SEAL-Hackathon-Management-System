import express from "express";
import { handleCreateScore, handleUpdateScore, handleGetProgress, handleGetMyScores, handleGetJudgeSchedule } from "../controllers/scoreController.js";
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

router.get(
  "/contests/:contestId/rounds/:roundId/judge-schedule",
  authenticate, authorize("judge"),
  handleGetJudgeSchedule
);

export default router;
