import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/authMiddleware.js";
import { recalculate, list, leaderboard } from "../controllers/rankingController.js";

const router = Router({ mergeParams: true });

// GET /api/contests/:contestId/rounds/:roundId/leaderboard
router.get("/leaderboard", authenticate, leaderboard);

// GET /api/contests/:contestId/rounds/:roundId/rankings
router.get("/rankings", authenticate, list);

// POST /api/contests/:contestId/rounds/:roundId/rankings/recalculate
router.post("/rankings/recalculate", authenticate, requireRole("admin"), recalculate);

export default router;
