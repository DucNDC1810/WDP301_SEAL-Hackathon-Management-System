import { getOverviewForUser } from "../services/overviewService.js";

/**
 * GET /api/overview/me
 * One aggregated payload for the student Overview page.
 */
export const handleGetMyOverview = async (req, res) => {
  try {
    const overview = await getOverviewForUser(req.user);
    res.status(200).json(overview);
  } catch (err) {
    console.error("[handleGetMyOverview]", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ",
    });
  }
};
