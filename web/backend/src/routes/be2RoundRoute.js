import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/authMiddleware.js";
import {
  handleReleaseProblem,
  handleFlagLateTeam,
  handleCheckJudgeCompletion,
} from "../controllers/be2RoundController.js";

const router = Router();

// POST /api/rounds/:id/release-problem - Công bố đề thi (COORDINATOR/admin)
router.post("/:id/release-problem", authenticate, requireRole("admin"), handleReleaseProblem);

// POST /api/rounds/:id/flag-late-team - Flag đội check-in trễ (COORDINATOR/admin)
router.post("/:id/flag-late-team", authenticate, requireRole("admin"), handleFlagLateTeam);

// GET /api/rounds/:id/judge-completion - Kiểm tra tiến độ chấm thi của giám khảo (COORDINATOR/admin)
router.get("/:id/judge-completion", authenticate, requireRole("admin"), handleCheckJudgeCompletion);

export default router;
