import {
  drawPools,
  getPoolsByContest,
  resetPools,
  createEmptyPools,
  assignTeamsToExistingPools,
  addSinglePool,
} from "../services/poolService.js";

/**
 * POST /contests/:contestId/draw-pools
 * Chia bảng đấu ngẫu nhiên.
 */
export const handleDrawPools = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { pool_count, assign_topics } = req.body;

    // Validate required fields
    if (pool_count === undefined || Number(pool_count) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp số lượng bảng đấu hợp lệ (pool_count > 0)",
      });
    }

    const { pools, warning } = await drawPools(contestId, {
      pool_count: Number(pool_count),
      assign_topics: !!assign_topics,
    });

    res.status(201).json({
      success: true,
      message: "Chia bảng đấu thành công",
      warning,
      data: pools,
    });
  } catch (error) {
    console.error("[handleDrawPools]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * GET /contests/:contestId/pools
 * Lấy danh sách các bảng đấu của cuộc thi.
 */
export const handleGetPoolsByContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const pools = await getPoolsByContest(contestId);

    res.status(200).json({
      success: true,
      data: pools,
    });
  } catch (error) {
    console.error("[handleGetPoolsByContest]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * DELETE /contests/:contestId/pools
 * Đặt lại (reset) toàn bộ bảng đấu của cuộc thi.
 */
export const handleResetPools = async (req, res) => {
  try {
    const { contestId } = req.params;
    await resetPools(contestId);

    res.status(200).json({
      success: true,
      message: "Đặt lại các bảng đấu thành công",
    });
  } catch (error) {
    console.error("[handleResetPools]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * POST /contests/:contestId/create-empty
 * Tạo các bảng đấu trống.
 */
export const handleCreateEmptyPools = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { pool_count, pools } = req.body;

    if (
      (!pools || !Array.isArray(pools) || pools.length === 0) &&
      (pool_count === undefined || Number(pool_count) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp danh sách bảng đấu hoặc số lượng bảng đấu hợp lệ",
      });
    }

    const createdPools = await createEmptyPools(contestId, {
      pool_count: pool_count ? Number(pool_count) : undefined,
      pools,
    });

    res.status(201).json({
      success: true,
      message: "Tạo các bảng đấu trống thành công",
      data: createdPools,
    });
  } catch (error) {
    console.error("[handleCreateEmptyPools]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * POST /contests/:contestId/assign-teams
 * Xếp các đội đã CONFIRMED vào các bảng đấu có sẵn ngẫu nhiên.
 */
export const handleAssignTeams = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { assign_topics } = req.body;

    const { pools, warning } = await assignTeamsToExistingPools(contestId, {
      assign_topics: !!assign_topics,
    });

    res.status(200).json({
      success: true,
      message: "Xếp các đội vào bảng đấu thành công",
      warning,
      data: pools,
    });
  } catch (error) {
    console.error("[handleAssignTeams]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * POST /contests/:contestId/add-single
 * Thêm một bảng đấu đơn lẻ vào cuộc thi.
 */
export const handleAddSinglePool = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { pool_name, description } = req.body;

    const newPool = await addSinglePool(contestId, { pool_name, description });

    res.status(201).json({
      success: true,
      message: "Thêm bảng đấu thành công",
      data: newPool,
    });
  } catch (error) {
    console.error("[handleAddSinglePool]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

