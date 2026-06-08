import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/authMiddleware.js";
import { audit } from "../middlewares/auditMiddleware.js";
import { assign, remove, getByRound, getMyAssignments } from "../controllers/judgeAssignmentController.js";

// Nested router: /api/contests/:contestId/rounds/:roundId/judge-assignments
export const nestedRouter = Router({ mergeParams: true });

nestedRouter.get("/", authenticate, requireRole("admin"), getByRound);
nestedRouter.post("/", authenticate, requireRole("admin"), audit("JudgeAssignment", "ASSIGN"), assign);

// Root-level router: /api/judge-assignments
const router = Router();

// GET /api/judge-assignments/me — judge xem assignments của mình
router.get("/me", authenticate, getMyAssignments);

// DELETE /api/judge-assignments/:assignmentId
router.delete("/:assignmentId", authenticate, requireRole("admin"), audit("JudgeAssignment", "REMOVE"), remove);

export default router;
