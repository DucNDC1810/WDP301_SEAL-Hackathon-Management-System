import {
  drawPools,
  getPoolsByContest,
  resetPools,
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
