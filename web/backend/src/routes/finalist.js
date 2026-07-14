import { Router } from "express";
import Round from "../models/Round.js";
import Contest from "../models/Contest.js";
import Team from "../models/Team.js";
import Score from "../models/Score.js";
import AuditLog from "../models/AuditLog.js";
import { sendNotification } from "../services/notification.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import Pool from "../models/Pool.js";
import Criteria from "../models/Criteria.js";

const router = Router();

// GET /api/finalist/:round_id
router.get("/:round_id", authenticate, async (req, res, next) => {
  try {
    const { round_id } = req.params;

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
    }

    const contest = await Contest.findById(round.contest_id);
    if (!contest) {
      return res.status(404).json({ success: false, message: "Không tìm thấy giải đấu" });
    }

    const boundary = round.top_n || 6;
    const wildcardCount = round.wildcard_count || 1;
    const wildcardEnabled = contest.wildcard_enabled && round.wildcard_enabled;

    // Find all teams in the contest
    const teams = await Team.find({ contest_id: round.contest_id });

    const pools = await Pool.find({ round_id }).lean();
    const teamPoolMap = {};
    for (const pool of pools) {
      if (pool.teams) {
        for (const tId of pool.teams) {
          teamPoolMap[tId.toString()] = pool.pool_name;
        }
      }
    }

    // Find all final normal scores for this round
    const scores = await Score.find({
      round_id: round_id,
      score_type: "NORMAL",
      is_final: true,
    });

    const scoreMap = {};
    for (const score of scores) {
      const teamIdStr = score.team_id.toString();
      if (!scoreMap[teamIdStr]) {
        scoreMap[teamIdStr] = [];
      }
      scoreMap[teamIdStr].push(score.weighted_avg_score || 0);
    }

    const teamList = [];
    for (const team of teams) {
      const teamScores = scoreMap[team._id.toString()];
      const avgScore = teamScores && teamScores.length > 0
        ? teamScores.reduce((sum, val) => sum + val, 0) / teamScores.length
        : 0;

      teamList.push({
        team_id: team._id,
        team_name: team.name || team.team_name || "Unknown Team",
        assigned_group: teamPoolMap[team._id.toString()] || team.assigned_group || "Chưa phân bảng",
        status: team.status || "ACTIVE",
        weighted_avg_score: Math.round(avgScore * 100) / 100,
      });
    }

    // Group by assigned_group to find Top N
    const groupsMap = {};
    for (const team of teamList) {
      const groupName = team.assigned_group || "Chưa phân bảng";
      if (!groupsMap[groupName]) {
        groupsMap[groupName] = [];
      }
      groupsMap[groupName].push(team);
    }

    const automaticFinalists = [];
    const wildcardPool = [];

    for (const [groupName, groupTeams] of Object.entries(groupsMap)) {
      groupTeams.sort((a, b) => b.weighted_avg_score - a.weighted_avg_score);
      groupTeams.forEach((team, index) => {
        const rank = index + 1;
        if (rank <= boundary) {
          automaticFinalists.push({
            team_id: team.team_id,
            team_name: team.team_name,
            assigned_group: team.assigned_group,
            status: team.status,
            is_wildcard: false,
            weighted_avg_score: team.weighted_avg_score
          });
        } else {
          wildcardPool.push({
            team_id: team.team_id,
            team_name: team.team_name,
            assigned_group: team.assigned_group,
            status: team.status,
            weighted_avg_score: team.weighted_avg_score
          });
        }
      });
    }

    let wildcardFinalists = [];
    if (wildcardEnabled && wildcardCount > 0) {
      wildcardPool.sort((a, b) => b.weighted_avg_score - a.weighted_avg_score);
      wildcardFinalists = wildcardPool.slice(0, wildcardCount).map(t => ({
        team_id: t.team_id,
        team_name: t.team_name,
        assigned_group: t.assigned_group,
        status: t.status,
        is_wildcard: true,
        weighted_avg_score: t.weighted_avg_score
      }));
    }

    const finalists = [...automaticFinalists, ...wildcardFinalists];

    // Find next round
    let next_round_id = null;
    if (contest.rounds && contest.rounds.length > 0) {
      const currentIdx = contest.rounds.findIndex(r => r._id.toString() === round_id);
      if (currentIdx !== -1 && currentIdx < contest.rounds.length - 1) {
        const nextSubRound = contest.rounds[currentIdx + 1];
        next_round_id = nextSubRound._id.toString();

        // Ensure standalone Round document exists
        let existingRound = await Round.findById(next_round_id);
        if (!existingRound) {
          await Round.create({
            _id: nextSubRound._id,
            contest_id: round.contest_id,
            name: nextSubRound.name,
            type: nextSubRound.round_number === 2 || nextSubRound.name.toLowerCase().includes("chung kết") || nextSubRound.name.toLowerCase().includes("final") ? "FINAL" : "PRELIMINARY",
            is_active: false,
            round_start: nextSubRound.start_time || new Date(),
            round_end: nextSubRound.end_time || nextSubRound.submission_deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          });

          // Copy score criteria from contest.rounds config to standalone Criteria collection
          if (nextSubRound.score_criteria && nextSubRound.score_criteria.length > 0) {
            const criteriaToCreate = nextSubRound.score_criteria.map(c => ({
              round_id: nextSubRound._id,
              name: c.name,
              weight: c.weight,
              description: c.description || ""
            }));
            await Criteria.insertMany(criteriaToCreate);
          }
        }
      }
    }

    return res.status(200).json({
      finalists,
      next_round_id
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/finalist/:round_id/team/:team_id
router.patch("/:round_id/team/:team_id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { round_id, team_id } = req.params;
    const { status } = req.body;

    if (!["ACTIVE", "ELIMINATED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
    }

    const team = await Team.findById(team_id);
    if (!team) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đội thi" });
    }

    const oldStatus = team.status;
    team.status = status;
    await team.save();

    // Create AuditLog
    await AuditLog.create({
      entity_type: "Team",
      entity_id: team._id,
      action: "STATUS_CHANGED",
      old_value: { status: oldStatus },
      new_value: { status: status },
      performed_by: req.user?._id || null,
      performed_at: new Date(),
      // Compatibility fields
      resource: "TEAM",
      resource_id: team._id,
      actor_id: req.user?._id || null,
      actor_email: req.user?.email || "system",
      before: { status: oldStatus },
      after: { status: status },
    });

    // Create Notifications for all team members
    if (team.members && team.members.length > 0) {
      const type = status === "ACTIVE" ? "TEAM_CONFIRMED" : "TEAM_ELIMINATED";
      const title = status === "ACTIVE" ? "Xác nhận vào vòng chung kết" : "Bị loại khỏi danh sách chung kết";
      const message = status === "ACTIVE" 
        ? `Đội ${team.name} của bạn đã được xác nhận vào vòng chung kết!`
        : `Đội ${team.name} của bạn đã bị loại khỏi danh sách chung kết.`;

      const recipientIds = team.members.map(m => m.user_id).filter(id => id);
      if (recipientIds.length > 0) {
        await sendNotification({
          recipientIds,
          type,
          payload: {
            title,
            message,
            ref_id: team._id,
            ref_type: "Team"
          }
        });
      }
    }

    return res.status(200).json({
      success: true,
      team_id,
      new_status: status
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/finalist/:round_id/audit-log
router.get("/:round_id/audit-log", authenticate, async (req, res, next) => {
  try {
    const { round_id } = req.params;

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
    }

    // Find all teams in this contest to filter audit logs
    const teams = await Team.find({ contest_id: round.contest_id });
    const teamIds = teams.map(t => t._id);

    const logs = await AuditLog.find({
      entity_type: "Team",
      entity_id: { $in: teamIds }
    })
    .populate("performed_by", "name email")
    .sort({ performed_at: -1 });

    return res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
});

export default router;
