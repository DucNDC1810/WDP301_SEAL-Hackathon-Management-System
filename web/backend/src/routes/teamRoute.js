import express from "express";
import {
  handleCreateTeam,
  handleJoinTeam,
  handleVerifyMemberEmail,
  handleGetMyTeams,
  handleGetTeamsByContest,
  handleGetTeamById,
  handleGetMyTeam,
  handleApproveTeam,
  handleRejectTeam,
  handleUpdateTeam,
  handleDeleteTeam,
  handleDisqualifyTeam,
  handleResendMemberVerification,
  handleInviteMember,
  handleSelectTopic,
  handleProposeTopic,
  handleEliminateTeam,
  handleRegisterContest,
  handleUpdateTeamContributions,
} from "../controllers/teamController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import { audit } from "../middlewares/auditMiddleware.js";

const router = express.Router();

// ─── Public ──────────────────────────────────────────────────────────────────

// GET /api/teams/verify?token=   — xác nhận email thành viên
router.get("/verify", handleVerifyMemberEmail);

// GET /api/teams/me — lấy tất cả đội của user hiện tại
router.get("/me", authenticate, handleGetMyTeams);

// POST /api/teams/join — tham gia đội bằng mã đội (team_code = _id)
router.post("/join", authenticate, handleJoinTeam);

// POST /api/teams — tạo đội tự do
router.post("/", authenticate, audit("TEAM", "CREATE"), handleCreateTeam);

// POST /api/teams/:id/register-contest — đăng ký đội thi vào cuộc thi
router.post("/:id/register-contest", authenticate, handleRegisterContest);

// POST /api/teams/contests/:contestId/teams — đăng ký đội (alias)
router.post("/contests/:contestId/teams", authenticate, handleCreateTeam);

// POST /api/teams/contests/:contestId         — đăng ký đội thi mới
router.post("/contests/:contestId", authenticate, audit("TEAM", "CREATE"), handleCreateTeam);

// GET  /api/teams/contests/:contestId/my      — xem đội của mình trong contest
router.get("/contests/:contestId/my", authenticate, handleGetMyTeam);

// GET  /api/teams/:id                         — xem chi tiết đội thi
router.get("/:id", authenticate, handleGetTeamById);

// PATCH /api/teams/:id                        — leader cập nhật tên đội
router.patch("/:id", authenticate, audit("TEAM", "UPDATE"), handleUpdateTeam);

// PUT /api/teams/:id/contributions            — leader đánh giá đóng góp thành viên
router.put("/:id/contributions", authenticate, audit("TEAM", "UPDATE"), handleUpdateTeamContributions);

// DELETE /api/teams/:id                       — leader/admin xóa đội (pending only)
router.delete("/:id", authenticate, audit("TEAM", "DELETE"), handleDeleteTeam);

// POST /api/teams/:id/resend-verification     — leader gửi lại email cho thành viên
router.post("/:id/resend-verification", authenticate, handleResendMemberVerification);

// POST /api/teams/:id/members                — leader mời thành viên mới qua email
router.post("/:id/members", authenticate, handleInviteMember);

// POST /api/teams/:id/select-topic           — leader chọn đề tài có sẵn
router.post("/:id/select-topic", authenticate, handleSelectTopic);

// POST /api/teams/:id/propose-topic          — leader đề xuất đề tài riêng
router.post("/:id/propose-topic", authenticate, handleProposeTopic);

// ─── Admin only ───────────────────────────────────────────────────────────────

// GET /api/teams/contests/:contestId/all      — danh sách tất cả đội của contest
router.get(
  "/contests/:contestId/all",
  authenticate,
  authorize("admin", "mentor"),
  handleGetTeamsByContest
);

// GET /api/teams/contests/:contestId/teams    — danh sách tất cả đội của contest
router.get(
  "/contests/:contestId/teams",
  authenticate,
  authorize("admin", "mentor"),
  handleGetTeamsByContest
);

// PUT /api/teams/:id/approve                  — admin duyệt đội
router.put("/:id/approve", authenticate, authorize("admin"), handleApproveTeam);

// PUT /api/teams/:id/reject                   — admin từ chối duyệt
router.put("/:id/reject", authenticate, authorize("admin"), handleRejectTeam);

// PUT /api/teams/:id/disqualify               — loại đội thi
router.put("/:id/disqualify", authenticate, authorize("admin"), audit("TEAM", "DISQUALIFY"), handleDisqualifyTeam);

// PATCH /api/teams/:id/eliminate              — loại đội thi và re-rank (COORDINATOR/admin)
router.patch("/:id/eliminate", authenticate, authorize("admin"), handleEliminateTeam);

export default router;
