import express from "express";
import { handleCreateScore, handleUpdateScore, handleGetProgress } from "../controllers/scoreController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authenticate, authorize("mentor"), handleCreateScore);
router.put("/:id", authenticate, authorize("mentor"), handleUpdateScore);
router.get(
  "/contests/:contestId/rounds/:roundId/progress",
  authenticate, authorize("admin", "mentor"),
  handleGetProgress
);

export default router;
