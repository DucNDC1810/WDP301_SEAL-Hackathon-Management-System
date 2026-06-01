import express from "express";
import {
  handleCreateTeam,
  handleVerifyMemberEmail,
  handleGetTeamsByContest,
  handleGetTeamById,
  handleDisqualifyTeam,
} from "../controllers/teamController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/teams/verify - Xác nhận email thành viên (Public)
router.get("/verify", handleVerifyMemberEmail);

// POST /api/teams/contests/:contestId/teams - Đăng ký đội thi mới (Đã đăng nhập)
router.post("/contests/:contestId/teams", authenticate, handleCreateTeam);

// GET /api/teams/contests/:contestId/teams - Lấy toàn bộ đội thi của cuộc thi (Chỉ Admin)
router.get(
  "/contests/:contestId/teams",
  authenticate,
  authorize("admin"),
  handleGetTeamsByContest
);

// GET /api/teams/:id - Lấy chi tiết đội thi (Đã đăng nhập)
router.get("/:id", authenticate, handleGetTeamById);

// PUT /api/teams/:id/disqualify - Loại đội thi khỏi cuộc thi (Chỉ Admin)
router.put("/:id/disqualify", authenticate, authorize("admin"), handleDisqualifyTeam);

export default router;
