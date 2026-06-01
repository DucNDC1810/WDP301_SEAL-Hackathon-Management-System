import express from "express";
import { handleCalculateRankings, handleGetRankings } from "../controllers/rankingController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import { blockContestantScoreAccess } from "../middlewares/scoreAccessMiddleware.js";

const router = express.Router();

router.post(
  "/contests/:contestId/rounds/:roundId/calculate",
  authenticate, authorize("admin"),
  handleCalculateRankings
);
router.get(
  "/contests/:contestId/rounds/:roundId",
  authenticate, blockContestantScoreAccess,
  handleGetRankings
);

export default router;
