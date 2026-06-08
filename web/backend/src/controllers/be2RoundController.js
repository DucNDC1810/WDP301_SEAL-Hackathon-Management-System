import {
  releaseProblem,
  flagLateTeam,
  checkJudgeCompletion,
} from "../services/roundService.js";

/**
 * Handle POST /api/rounds/:id/release-problem
 */
export const handleReleaseProblem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const round = await releaseProblem(id, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Công bố đề thi thành công",
      data: round,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Handle POST /api/rounds/:id/flag-late-team
 */
export const handleFlagLateTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { team_id, reason, check_in_time } = req.body;

    if (!team_id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin đội thi (team_id)",
      });
    }

    const team = await flagLateTeam(
      id,
      { team_id, reason, check_in_time },
      req.user._id
    );

    return res.status(200).json({
      success: true,
      message: "Đã xử lý đội thi trễ và loại thành công",
      data: team,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Handle GET /api/rounds/:id/judge-completion
 */
export const handleCheckJudgeCompletion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await checkJudgeCompletion(id);

    return res.status(200).json({
      success: true,
      data: result.data,
      summary: result.summary,
    });
  } catch (error) {
    next(error);
  }
};
