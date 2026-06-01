import {
  getAvailableTeams,
  getActiveCompetitions,
  createTeam,
  joinTeam,
  getMyTeam,
  submitProject as submitProjectService,
} from "../services/teamService.js";

// ─── GET /api/teams/competitions ────────────────────────────────────────────

/**
 * Lấy danh sách cuộc thi đang mở.
 */
export const listActiveCompetitions = async (req, res) => {
  try {
    const competitions = await getActiveCompetitions();
    res.status(200).json({
      success: true,
      data: competitions,
    });
  } catch (error) {
    console.error("[listActiveCompetitions]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── GET /api/teams?competition_id=xxx ──────────────────────────────────────

/**
 * Lấy danh sách teams đang mở trong cuộc thi.
 */
export const listTeams = async (req, res) => {
  try {
    const { competition_id } = req.query;
    if (!competition_id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu competition_id",
      });
    }

    const teams = await getAvailableTeams(competition_id);
    res.status(200).json({
      success: true,
      count: teams.length,
      data: teams,
    });
  } catch (error) {
    console.error("[listTeams]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── POST /api/teams ────────────────────────────────────────────────────────

/**
 * Tạo đội mới.
 * Body: { team_name, competition_id }
 */
export const create = async (req, res) => {
  try {
    const { team_name, competition_id, max_members } = req.body;

    if (!team_name || !competition_id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu team_name hoặc competition_id",
      });
    }

    const result = await createTeam(req.user._id, team_name, competition_id, max_members);

    res.status(201).json({
      success: true,
      message: "Tạo đội thành công",
      data: result,
    });
  } catch (error) {
    console.error("[createTeam]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── POST /api/teams/:id/join ───────────────────────────────────────────────

/**
 * Tham gia đội.
 */
export const join = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await joinTeam(req.user._id, id);

    res.status(200).json({
      success: true,
      message: "Tham gia đội thành công",
      data: result,
    });
  } catch (error) {
    console.error("[joinTeam]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── GET /api/teams/my-team ─────────────────────────────────────────────────

/**
 * Lấy thông tin đội hiện tại của user.
 */
export const myTeam = async (req, res) => {
  try {
    const team = await getMyTeam(req.user._id);

    if (!team) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "Bạn chưa tham gia đội nào",
      });
    }

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error("[myTeam]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── POST /api/teams/:id/submit ─────────────────────────────────────────────

/**
 * Nộp bài dự thi.
 */
export const submitProject = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await submitProjectService(req.user._id, id, req.body);
    res.status(200).json({
      success: true,
      data: result,
      message: "Gửi thông tin nhóm thành công"
    });
  } catch (error) {
    console.error("[submitProject]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};
