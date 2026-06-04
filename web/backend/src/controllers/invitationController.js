import {
  sendInvitation,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
  getInvitationsByContest,
  getInvitationByToken,
} from "../services/invitationService.js";

// ─── handleSendInvitation ─────────────────────────────────────────────────────

/**
 * POST /api/invitations/contests/:contestId
 * Admin gửi lời mời mentor.
 */
export const handleSendInvitation = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp email" });
    }

    const invitation = await sendInvitation(contestId, email, req.user._id);

    res.status(201).json({
      success: true,
      message: `Đã gửi lời mời đến ${email}`,
      data: invitation,
    });
  } catch (error) {
    console.error("[handleSendInvitation]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleGetInvitationByToken ───────────────────────────────────────────────

/**
 * GET /api/invitations/preview?token=
 * Lấy thông tin lời mời trước khi accept (để frontend hiển thị).
 */
export const handleGetInvitationByToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token không hợp lệ" });
    }

    const invitation = await getInvitationByToken(token);
    res.status(200).json({ success: true, data: invitation });
  } catch (error) {
    console.error("[handleGetInvitationByToken]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleAcceptInvitation ───────────────────────────────────────────────────

/**
 * POST /api/invitations/accept?token=
 * Mentor xác nhận tham gia.
 */
export const handleAcceptInvitation = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token không hợp lệ" });
    }

    const result = await acceptInvitation(token);

    if (result.needsRegistration) {
      return res.status(200).json({
        success: true,
        needsRegistration: true,
        message: "Email chưa có tài khoản. Vui lòng đăng ký để hoàn tất.",
        data: { email: result.email, contest_id: result.contest_id },
      });
    }

    res.status(200).json({
      success: true,
      message: "Chấp nhận lời mời thành công. Bạn đã được gán role mentor.",
      data: result,
    });
  } catch (error) {
    console.error("[handleAcceptInvitation]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleDeclineInvitation ──────────────────────────────────────────────────

/**
 * POST /api/invitations/decline?token=
 * Mentor từ chối lời mời.
 */
export const handleDeclineInvitation = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token không hợp lệ" });
    }

    await declineInvitation(token);
    res.status(200).json({ success: true, message: "Đã từ chối lời mời" });
  } catch (error) {
    console.error("[handleDeclineInvitation]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleCancelInvitation ───────────────────────────────────────────────────

/**
 * DELETE /api/invitations/:id
 * Admin huỷ lời mời.
 */
export const handleCancelInvitation = async (req, res) => {
  try {
    await cancelInvitation(req.params.id, req.user._id);
    res.status(200).json({ success: true, message: "Đã huỷ lời mời" });
  } catch (error) {
    console.error("[handleCancelInvitation]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleGetInvitationsByContest ────────────────────────────────────────────

/**
 * GET /api/invitations/contests/:contestId
 * Admin xem danh sách lời mời của contest.
 */
export const handleGetInvitationsByContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { status } = req.query;
    const invitations = await getInvitationsByContest(contestId, { status });
    res.status(200).json({ success: true, count: invitations.length, data: invitations });
  } catch (error) {
    console.error("[handleGetInvitationsByContest]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};
