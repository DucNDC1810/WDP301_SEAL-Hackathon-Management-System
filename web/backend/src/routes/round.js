import { Router } from "express";
import Round from "../models/Round.js";
import Criteria from "../models/Criteria.js";
import JudgeAssignment from "../models/JudgeAssignment.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import Score from "../models/Score.js";
import Team from "../models/Team.js";
import Notification from "../models/Notification.js";
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

    // Fetch criteria from standalone Criteria collection
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

// POST /api/round/:round_id/criteria/sync – Full replace criteria list from Contest config
router.post("/:round_id/criteria/sync", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { round_id } = req.params;
    const { criteria } = req.body; // Array of { name, weight, description }

    if (!Array.isArray(criteria)) {
      return res.status(400).json({ success: false, message: "criteria phải là mảng." });
    }

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi." });
    }

    // Delete existing and re-insert (full replace)
    await Criteria.deleteMany({ round_id });

    let inserted = [];
    if (criteria.length > 0) {
      inserted = await Criteria.insertMany(
        criteria.map(c => ({
          round_id,
          name: (c.name || "").trim(),
          weight: Number(c.weight) || 0,
          description: (c.description || "").trim(),
        }))
      );
    }

    return res.status(200).json({ success: true, count: inserted.length });
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

// POST /api/round/:round_id/criteria – Create a new criterion
router.post("/:round_id/criteria", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { round_id } = req.params;
    const { name, weight, description } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Tên tiêu chí không được để trống." });
    }
    const w = parseFloat(weight);
    if (isNaN(w) || w < 0 || w > 1) {
      return res.status(400).json({ success: false, message: "Trọng số phải nằm trong khoảng 0 – 1." });
    }

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi." });
    }

    const crit = await Criteria.create({
      round_id,
      name: name.trim(),
      weight: w,
      description: description?.trim() || "",
    });

    return res.status(201).json({ success: true, criteria: crit });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/round/:round_id/criteria/:criteria_id – Update a criterion
router.patch("/:round_id/criteria/:criteria_id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { round_id, criteria_id } = req.params;
    const { name, weight, description } = req.body;

    const crit = await Criteria.findOne({ _id: criteria_id, round_id });
    if (!crit) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tiêu chí." });
    }

    if (name !== undefined) crit.name = name.trim();
    if (weight !== undefined) {
      const w = parseFloat(weight);
      if (isNaN(w) || w < 0 || w > 1) {
        return res.status(400).json({ success: false, message: "Trọng số phải nằm trong khoảng 0 – 1." });
      }
      crit.weight = w;
    }
    if (description !== undefined) crit.description = description.trim();
    await crit.save();

    return res.status(200).json({ success: true, criteria: crit });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/round/:round_id/criteria/:criteria_id – Delete a criterion
router.delete("/:round_id/criteria/:criteria_id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { round_id, criteria_id } = req.params;

    const crit = await Criteria.findOneAndDelete({ _id: criteria_id, round_id });
    if (!crit) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tiêu chí." });
    }

    return res.status(200).json({ success: true, deleted_id: criteria_id });
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

// PATCH /api/round/:round_id/finish
router.patch("/:round_id/finish", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { round_id } = req.params;

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
    }

    if (round.status !== "PENDING_CONFIRM") {
      return res.status(400).json({
        success: false,
        error: "INVALID_STATUS",
        message: "Chỉ có thể xác nhận FINISHED từ trạng thái PENDING_CONFIRM"
      });
    }

    // Set round status to FINISHED
    const oldStatus = round.status;
    round.status = "FINISHED";
    await round.save();

    // Mark all NORMAL scores in this round as final
    await Score.updateMany(
      { round_id, score_type: "NORMAL" },
      { is_final: true }
    );

    // Write audit log
    await AuditLog.create({
      entity_type: "Round",
      entity_id: round._id,
      action: "ROUND_FINISHED",
      old_value: { status: oldStatus },
      new_value: { status: "FINISHED" },
      performed_by: req.user?._id || null,
      performed_at: new Date(),
      resource: "ROUND",
      resource_id: round._id,
      actor_id: req.user?._id || null,
      actor_email: req.user?.email || "system",
      before: { status: oldStatus },
      after: { status: "FINISHED" },
    });

    // Send RESULT_PUBLISHED notification to all members of ACTIVE teams in this round
    const activeTeams = await Team.find({ contest_id: round.contest_id, status: { $in: ["ACTIVE", "CONFIRMED"] } });
    const notifications = [];
    for (const team of activeTeams) {
      for (const member of team.members) {
        if (member.user_id) {
          notifications.push({
            user_id: member.user_id,
            type: "RESULT_PUBLISHED",
            title: "Kết quả đã được công bố",
            message: `Kết quả vòng thi "${round.name}" đã được công bố.`,
            ref_id: round._id,
            ref_type: null,
          });
        }
      }
    }
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    return res.status(200).json({ success: true, status: "FINISHED" });
  } catch (error) {
    next(error);
  }
});


export default router;
