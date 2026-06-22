import { Router } from "express";
import Round from "../models/Round.js";
import FinalSubmission from "../models/FinalSubmission.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = Router();

/**
 * GET /api/submission/:round_id/team/:team_id
 * Lấy submission hiện tại của team trong vòng thi.
 * Trả về { submission, deadline, is_locked }
 */
router.get("/:round_id/team/:team_id", authenticate, async (req, res, next) => {
  try {
    const { round_id, team_id } = req.params;

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
    }

    const deadline = round.round_end || null;
    const is_locked = deadline ? Date.now() > new Date(deadline).getTime() : false;

    const submission = await FinalSubmission.findOne({ round_id, team_id });

    return res.status(200).json({
      success: true,
      submission: submission || null,
      deadline,
      is_locked,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/submission/:round_id/team/:team_id
 * Nộp hoặc cập nhật bài của team trong vòng thi chung kết.
 * Body: { criteria_submissions: [...] }
 *
 * Hard-lock: nếu Date.now() > round.round_end → 403 DEADLINE_PASSED
 */
router.post("/:round_id/team/:team_id", authenticate, async (req, res, next) => {
  try {
    const { round_id, team_id } = req.params;
    const { criteria_submissions } = req.body;

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
    }

    // Hard deadline check — BE always enforces this regardless of FE state
    if (round.round_end && Date.now() > new Date(round.round_end).getTime()) {
      return res.status(403).json({
        success: false,
        error: "DEADLINE_PASSED",
        status: "LATE_REJECTED",
        message: "Đã quá hạn nộp bài. Bài nộp không được chấp nhận.",
      });
    }

    if (!Array.isArray(criteria_submissions)) {
      return res.status(400).json({ success: false, message: "criteria_submissions phải là mảng" });
    }

    // Upsert: create or update submission
    const submission = await FinalSubmission.findOneAndUpdate(
      { round_id, team_id },
      {
        $set: {
          criteria_submissions,
          status: "SUBMITTED",
          submitted_at: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      submission,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
