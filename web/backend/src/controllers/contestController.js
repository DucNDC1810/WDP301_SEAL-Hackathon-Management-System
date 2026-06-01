import {
  createContest,
  getContestById,
  getAllContests,
  updateContest,
  deleteContest,
  addRound,
  addScoreCriteria,
} from "../services/contestService.js";

/**
 * POST /
 * Tạo cuộc thi mới.
 */
export const handleCreateContest = async (req, res) => {
  try {
    const {
      title,
      description,
      start_date,
      end_date,
      registration_deadline,
      auto_close,
      max_teams_per_pool,
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên cuộc thi (title)",
      });
    }

    const created_by = req.user ? req.user._id : null;

    const contest = await createContest({
      title,
      description,
      start_date,
      end_date,
      registration_deadline,
      auto_close,
      max_teams_per_pool,
      created_by,
    });

    res.status(201).json({
      success: true,
      message: "Tạo cuộc thi thành công",
      data: contest,
    });
  } catch (error) {
    console.error("[handleCreateContest]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * GET /:id
 * Lấy chi tiết cuộc thi.
 */
export const handleGetContestById = async (req, res) => {
  try {
    const { id } = req.params;
    const contest = await getContestById(id);

    res.status(200).json({
      success: true,
      data: contest,
    });
  } catch (error) {
    console.error("[handleGetContestById]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * GET /
 * Lấy danh sách tất cả các cuộc thi.
 */
export const handleGetAllContests = async (req, res) => {
  try {
    const { status } = req.query;
    const contests = await getAllContests({ status });

    res.status(200).json({
      success: true,
      data: contests,
    });
  } catch (error) {
    console.error("[handleGetAllContests]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * PUT /:id
 * Cập nhật cuộc thi.
 */
export const handleUpdateContest = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const contest = await updateContest(id, updateData);

    res.status(200).json({
      success: true,
      message: "Cập nhật cuộc thi thành công",
      data: contest,
    });
  } catch (error) {
    console.error("[handleUpdateContest]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * DELETE /:id
 * Xóa cuộc thi.
 */
export const handleDeleteContest = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteContest(id);

    res.status(200).json({
      success: true,
      message: "Xóa cuộc thi thành công",
    });
  } catch (error) {
    console.error("[handleDeleteContest]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * POST /:id/rounds
 * Thêm vòng thi mới.
 */
export const handleAddRound = async (req, res) => {
  try {
    const { id } = req.params;
    const { round_number, name, start_time, end_time } = req.body;

    // Validate required fields
    if (round_number === undefined || !name) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin vòng thi (round_number, name)",
      });
    }

    const round = await addRound(id, {
      round_number,
      name,
      start_time,
      end_time,
    });

    res.status(201).json({
      success: true,
      message: "Thêm vòng thi thành công",
      data: round,
    });
  } catch (error) {
    console.error("[handleAddRound]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * POST /:id/rounds/:roundId/criteria
 * Thêm tiêu chí chấm điểm vào vòng thi.
 */
export const handleAddScoreCriteria = async (req, res) => {
  try {
    const { id, roundId } = req.params;
    const { name, max_score, weight, description } = req.body;

    // Validate required fields
    if (!name || max_score === undefined) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên tiêu chí (name) và điểm số tối đa (max_score)",
      });
    }

    const round = await addScoreCriteria(id, roundId, {
      name,
      max_score,
      weight,
      description,
    });

    res.status(201).json({
      success: true,
      message: "Thêm tiêu chí chấm điểm thành công",
      data: round,
    });
  } catch (error) {
    console.error("[handleAddScoreCriteria]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};
