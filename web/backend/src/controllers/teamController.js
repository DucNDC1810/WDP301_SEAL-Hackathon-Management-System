import {
  createTeam,
  verifyMemberEmail,
  getTeamsByContest,
  getTeamById,
  disqualifyTeam,
} from "../services/teamService.js";

/**
 * POST /contests/:contestId/teams
 * Đăng ký đội thi mới.
 */
export const handleCreateTeam = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { team_name, members } = req.body;

    // Validate required fields
    if (!team_name || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp tên đội (team_name) và danh sách thành viên (members)",
      });
    }

    // Leader is the authenticated user
    const leader_id = req.user ? req.user._id : null;
    if (!leader_id) {
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để tạo đội thi",
      });
    }

    const team = await createTeam(contestId, {
      team_name,
      leader_id,
      members,
    });

    res.status(201).json({
      success: true,
      message: "Tạo đội thi thành công. Vui lòng kiểm tra email để xác nhận thành viên.",
      data: team,
    });
  } catch (error) {
    console.error("[handleCreateTeam]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * GET /verify
 * Xác thực thành viên bằng token (gọi qua query string).
 */
export const handleVerifyMemberEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Không tìm thấy token xác thực",
      });
    }

    const team = await verifyMemberEmail(token);

    res.status(200).json({
      success: true,
      message: "Xác thực thành viên thành công",
      data: team,
    });
  } catch (error) {
    console.error("[handleVerifyMemberEmail]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * GET /contests/:contestId/teams
 * Lấy toàn bộ đội thi của cuộc thi.
 */
export const handleGetTeamsByContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const teams = await getTeamsByContest(contestId);

    res.status(200).json({
      success: true,
      data: teams,
    });
  } catch (error) {
    console.error("[handleGetTeamsByContest]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * GET /:id
 * Lấy chi tiết đội thi.
 */
export const handleGetTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await getTeamById(id);

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error("[handleGetTeamById]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * PUT /:id/disqualify
 * Loại đội thi khỏi cuộc thi (Disqualify).
 */
export const handleDisqualifyTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await disqualifyTeam(id);

    res.status(200).json({
      success: true,
      message: "Loại đội thi thành công",
      data: team,
    });
  } catch (error) {
    console.error("[handleDisqualifyTeam]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};
