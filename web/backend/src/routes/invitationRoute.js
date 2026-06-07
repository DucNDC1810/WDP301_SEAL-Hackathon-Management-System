import express from "express";
import {
  handleSendInvitation,
  handleGetInvitationByToken,
  handleAcceptInvitation,
  handleDeclineInvitation,
  handleCancelInvitation,
  handleGetInvitationsByContest,
} from "../controllers/invitationController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import { audit } from "../middlewares/auditMiddleware.js";

const router = express.Router();

// ─── Public (token-based, không cần login) ────────────────────────────────────

// GET  /api/invitations/preview?token=   — xem thông tin lời mời
router.get("/preview", handleGetInvitationByToken);

// POST /api/invitations/accept?token=    — chấp nhận lời mời
router.post("/accept", handleAcceptInvitation);

// POST /api/invitations/decline?token=   — từ chối lời mời
router.post("/decline", handleDeclineInvitation);

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
