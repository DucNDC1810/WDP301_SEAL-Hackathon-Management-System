import express from "express";
import { handleGetTeamGitStats } from "../controllers/teamGitStatsController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/teams/:teamId/rounds/:roundId/git-stats
router.get("/:teamId/rounds/:roundId/git-stats", authenticate, handleGetTeamGitStats);

export default router;
