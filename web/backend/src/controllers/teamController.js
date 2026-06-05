import {
  createTeam,
  verifyMemberEmail,
  getTeamsByContest,
  getTeamById,
  getMyTeam,
  getMyTeams,
  joinTeam,
  approveTeam,
  updateTeam,
  deleteTeam,
  disqualifyTeam,
  resendMemberVerification,
  inviteMember,
} from "../services/teamService.js";

/**
 * GET /me
 * Lấy danh sách đội thi của user hiện tại.
 */
export const handleGetMyTeams = async (req, res) => {
  try {
    const teams = await getMyTeams(req.user._id, req.user.email);
    res.json(teams);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};
export const handleJoinTeam = async (req, res) => {
  try {
    const { team_code } = req.body;
    if (!team_code) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp mã đội (team_code)" });
    }
    const team = await joinTeam(team_code, req.user._id, req.user.email);
    res.status(200).json({ success: true, message: "Tham gia đội thành công!", data: team });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

export const handleCreateTeam = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { team_name, members } = req.body;

    if (!team_name || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp tên đội (team_name) và danh sách thành viên (members)",
      });
    }

    const team = await createTeam(contestId, {
      team_name,
      leader_id: req.user._id,
      members,
    });

    res.status(201).json({
      success: true,
      message: "Tạo đội thi thành công. Vui lòng kiểm tra email để xác nhận thành viên.",
      data: team,
    });
  } catch (error) {
    console.error("[handleCreateTeam]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleVerifyMemberEmail ─────────────────────────────────────────────────

export const handleVerifyMemberEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: "Không tìm thấy token xác thực" });
    }

    const team = await verifyMemberEmail(token);
    res.status(200).json({ success: true, message: "Xác thực thành viên thành công", data: team });
  } catch (error) {
    console.error("[handleVerifyMemberEmail]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleGetTeamsByContest ─────────────────────────────────────────────────

export const handleGetTeamsByContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { status } = req.query;
    const teams = await getTeamsByContest(contestId, { status });
    res.status(200).json({ success: true, count: teams.length, data: teams });
  } catch (error) {
    console.error("[handleGetTeamsByContest]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleGetTeamById ───────────────────────────────────────────────────────

export const handleGetTeamById = async (req, res) => {
  try {
    const team = await getTeamById(req.params.id);
    res.status(200).json({ success: true, data: team });
  } catch (error) {
    console.error("[handleGetTeamById]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleGetMyTeam ─────────────────────────────────────────────────────────

export const handleGetMyTeam = async (req, res) => {
  try {
    const { contestId } = req.params;
    const team = await getMyTeam(contestId, req.user._id);
    if (!team) {
      return res.status(404).json({ success: false, message: "Bạn chưa tham gia đội thi nào trong cuộc thi này" });
    }
    res.status(200).json({ success: true, data: team });
  } catch (error) {
    console.error("[handleGetMyTeam]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleUpdateTeam ────────────────────────────────────────────────────────

export const handleUpdateTeam = async (req, res) => {
  try {
    const { team_name } = req.body;
    if (!team_name) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp tên đội mới" });
    }
    const team = await updateTeam(req.params.id, req.user._id, { team_name });
    res.status(200).json({ success: true, message: "Cập nhật đội thi thành công", data: team });
  } catch (error) {
    console.error("[handleUpdateTeam]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleDeleteTeam ────────────────────────────────────────────────────────

export const handleDeleteTeam = async (req, res) => {
  try {
    const isAdmin = req.user.roles.some((r) => r.role_name === "admin");
    await deleteTeam(req.params.id, req.user._id, isAdmin);
    res.status(200).json({ success: true, message: "Đã xóa đội thi thành công" });
  } catch (error) {
    console.error("[handleDeleteTeam]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleDisqualifyTeam ────────────────────────────────────────────────────

export const handleApproveTeam = async (req, res) => {
  try {
    const team = await approveTeam(req.params.id);
    res.status(200).json({ success: true, message: "Duyệt đội thi thành công", data: team });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

export const handleDisqualifyTeam = async (req, res) => {
  try {
    const team = await disqualifyTeam(req.params.id);
    res.status(200).json({ success: true, message: "Loại đội thi thành công", data: team });
  } catch (error) {
    console.error("[handleDisqualifyTeam]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleResendMemberVerification ─────────────────────────────────────────

export const handleResendMemberVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp email thành viên" });
    }
    await resendMemberVerification(req.params.id, email, req.user._id);
    res.status(200).json({ success: true, message: "Đã gửi lại email xác nhận cho thành viên" });
  } catch (error) {
    console.error("[handleResendMemberVerification]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleInviteMember ───────────────────────────────────────────────────────

export const handleInviteMember = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp email thành viên muốn mời" });
    }
    const team = await inviteMember(req.params.id, email, req.user._id);
    res.status(200).json({ success: true, message: "Đã gửi lời mời tham gia đội qua email", data: team });
  } catch (error) {
    console.error("[handleInviteMember]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};
