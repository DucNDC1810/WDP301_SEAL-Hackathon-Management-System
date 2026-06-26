import express from "express";
import {
  handleSendInvitation,
  handleGetInvitationByToken,
  handleAcceptInvitation,
  handleDeclineInvitation,
  handleCancelInvitation,
  handleGetInvitationsByContest,
  handleCompleteJudgeRegistration,
  handleGetMyTeamInvitations,
  handleAcceptTeamInvitation,
  handleRejectTeamInvitation,
} from "../controllers/invitationController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import { audit } from "../middlewares/auditMiddleware.js";

const router = express.Router();

// ─── Public (token-based, không cần login) ────────────────────────────────────

// GET  /api/invitations/preview?token=        — xem thông tin lời mời
router.get("/preview", handleGetInvitationByToken);

// POST /api/invitations/accept?token=         — chấp nhận lời mời (mentor flow)
router.post("/accept", handleAcceptInvitation);

// POST /api/invitations/decline?token=        — từ chối lời mời
router.post("/decline", handleDeclineInvitation);

// POST /api/invitations/judge/complete        — external judge kích hoạt tài khoản
router.post("/judge/complete", handleCompleteJudgeRegistration);

// ─── Student: team member invitations ─────────────────────────────────────────
// GET  /api/invitations/me              — lấy danh sách lời mời đội của bản thân
router.get('/me', authenticate, handleGetMyTeamInvitations);

// POST /api/invitations/:id/accept      — chấp nhận lời mời vào đội
router.post('/:id/accept', authenticate, handleAcceptTeamInvitation);

// POST /api/invitations/:id/reject      — từ chối lời mời vào đội
router.post('/:id/reject', authenticate, handleRejectTeamInvitation);

// ─── Admin only ───────────────────────────────────────────────────────────────

// POST   /api/invitations/contests/:contestId   — gửi lời mời
router.post(
  "/contests/:contestId",
  authenticate,
  authorize("admin"),
  audit("INVITATION", "SEND"),
  handleSendInvitation
);

// GET    /api/invitations/contests/:contestId   — danh sách lời mời của contest
router.get(
  "/contests/:contestId",
  authenticate,
  authorize("admin"),
  handleGetInvitationsByContest
);

// DELETE /api/invitations/:id                   — huỷ lời mời
router.delete("/:id", authenticate, authorize("admin"), audit("INVITATION", "CANCEL"), handleCancelInvitation);

export default router;
