import { Router } from "express";
import Round from "../models/Round.js";
import Criteria from "../models/Criteria.js";
import JudgeAssignment from "../models/JudgeAssignment.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = Router();

// GET /api/round/:round_id/setup
router.get("/:round_id/setup", authenticate, async (req, res, next) => {
  try {
    const { round_id } = req.params;

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
    }

    // Fetch criteria
    const criteriaList = await Criteria.find({ round_id });
    const total_weight = criteriaList.reduce((sum, item) => sum + (item.weight || 0), 0);
    const weight_valid = Math.abs(total_weight - 1.0) <= 0.001;

    // Fetch currently assigned judges
    const assignments = await JudgeAssignment.find({ round_id }).populate("judge_id", "full_name email roles");
    const assignedJudges = assignments
      .filter(a => a.judge_id)
      .map(a => ({
        _id: a.judge_id._id,
        full_name: a.judge_id.full_name,
        email: a.judge_id.email,
        assigned_at: a.assigned_at || a.created_at
      }));

    // Fetch all available judges in the system
    const allAvailableJudges = await User.find({ "roles.role_name": "judge" }, "full_name email");

    return res.status(200).json({
      round,
      criteria: criteriaList,
      judges: assignedJudges,
      total_weight: Math.round(total_weight * 1000) / 1000,
      is_active: round.is_active || false,
      weight_valid,
      all_available_judges: allAvailableJudges
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/round/:round_id/judges
router.post("/:round_id/judges", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { round_id } = req.params;
    const { judge_ids } = req.body; // Array of judge User IDs

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
    }

    if (!Array.isArray(judge_ids)) {
      return res.status(400).json({ success: false, message: "Danh sách judge_ids không hợp lệ" });
    }

    // Sync database: delete assignments not in the sent list
    await JudgeAssignment.deleteMany({ round_id, judge_id: { $nin: judge_ids } });

    // Add new assignments
    for (const judge_id of judge_ids) {
      const existing = await JudgeAssignment.findOne({ judge_id, round_id });
      if (!existing) {
        await JudgeAssignment.create({
          judge_id,
          round_id,
          contest_id: round.contest_id,
          assigned_by: req.user?._id || null
        });
      }
    }

    // Return current assigned judges
    const updatedAssignments = await JudgeAssignment.find({ round_id }).populate("judge_id", "full_name email");
    const assignedJudges = updatedAssignments
      .filter(a => a.judge_id)
      .map(a => ({
        _id: a.judge_id._id,
        full_name: a.judge_id.full_name,
        email: a.judge_id.email,
        assigned_at: a.assigned_at || a.created_at
      }));

    return res.status(200).json(assignedJudges);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/round/:round_id/activate
router.patch("/:round_id/activate", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { round_id } = req.params;

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
    }

    // Check criteria weight
    const criteriaList = await Criteria.find({ round_id });
    const total_weight = criteriaList.reduce((sum, item) => sum + (item.weight || 0), 0);
    const weight_valid = Math.abs(total_weight - 1.0) <= 0.001;

    if (!weight_valid) {
      return res.status(400).json({ error: "WEIGHT_INVALID", total_weight });
    }

    // Check if at least 1 judge is assigned
    const judgeCount = await JudgeAssignment.countDocuments({ round_id, judge_id: { $ne: null } });
    if (judgeCount === 0) {
      return res.status(400).json({ error: "NO_JUDGES_ASSIGNED", message: "Vui lòng phân công ít nhất 1 Judge trước khi kích hoạt vòng thi." });
    }

    // Activate the round
    const beforeActive = round.is_active;
    round.is_active = true;
    await round.save();

    // Create AuditLog
    await AuditLog.create({
      entity_type: "Round",
      entity_id: round._id,
      action: "ROUND_ACTIVATED",
      old_value: { is_active: beforeActive },
      new_value: { is_active: true },
      performed_by: req.user?._id || null,
      performed_at: new Date(),
      // Compatibility fields
      resource: "ROUND",
      resource_id: round._id,
      actor_id: req.user?._id || null,
      actor_email: req.user?.email || "system",
      before: { is_active: beforeActive },
      after: { is_active: true },
    });

    return res.status(200).json({
      success: true,
      round_id,
      is_active: true
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/round/:round_id/judges
// Danh sách judges đã assign cho round này
router.get("/:round_id/judges", authenticate, async (req, res, next) => {
  try {
    const { round_id } = req.params;

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
    }

    const assignments = await JudgeAssignment.find({ round_id })
      .populate("judge_id", "full_name email")
      .lean();

    const judges = assignments
      .filter((a) => a.judge_id)
      .map((a) => ({
        assignment_id: a._id,
        judge_id: a.judge_id._id,
        full_name: a.judge_id.full_name,
        email: a.judge_id.email,
        assigned_at: a.assigned_at || a.created_at,
      }));

    return res.status(200).json({ success: true, judges });
  } catch (error) {
    next(error);
  }
});

// GET /api/round/:round_id/available-judges
// Tất cả user có role=judge, loại trừ những judge đã assign vào round PRELIMINARY cùng contest
router.get("/:round_id/available-judges", authenticate, async (req, res, next) => {
  try {
    const { round_id } = req.params;

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
    }

    // Tìm tất cả round PRELIMINARY trong cùng contest
    const preliminaryRounds = await Round.find({
      contest_id: round.contest_id,
      type: "PRELIMINARY",
    }).select("_id");
    const prelimRoundIds = preliminaryRounds.map((r) => r._id);

    // Tìm judge_ids đã assign vào vòng Sơ loại cùng contest
    const prelimAssignments = await JudgeAssignment.find({
      round_id: { $in: prelimRoundIds },
      judge_id: { $ne: null },
    }).select("judge_id");
    const excludedJudgeIds = prelimAssignments.map((a) => a.judge_id.toString());

    // Lấy tất cả user role=judge, loại trừ những người đã ở Sơ loại
    const allJudges = await User.find(
      { "roles.role_name": "judge" },
      "full_name email roles"
    ).lean();

    const available = allJudges.filter(
      (u) => !excludedJudgeIds.includes(u._id.toString())
    );

    return res.status(200).json({ success: true, judges: available });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/round/:round_id/judges/:judge_id
// Xóa phân công judge khỏi round
router.delete("/:round_id/judges/:judge_id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { round_id, judge_id } = req.params;

    const result = await JudgeAssignment.findOneAndDelete({ round_id, judge_id });
    if (!result) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phân công này" });
    }

    return res.status(200).json({ success: true, message: "Đã xóa phân công judge" });
  } catch (error) {
    next(error);
  }
});

export default router;
