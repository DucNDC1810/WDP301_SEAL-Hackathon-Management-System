import express from "express";
import { handleCreateScore, handleUpdateScore, handleGetProgress, handleGetMyScores } from "../controllers/scoreController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authenticate, authorize("mentor"), handleCreateScore);
router.put("/:id", authenticate, authorize("mentor"), handleUpdateScore);
router.get(
  "/contests/:contestId/rounds/:roundId/progress",
  authenticate, authorize("admin", "mentor"),
  handleGetProgress
);

router.get(
  "/contests/:contestId/rounds/:roundId/my-scores",
  authenticate, authorize("admin", "mentor"),
  handleGetMyScores
);

export default router;
