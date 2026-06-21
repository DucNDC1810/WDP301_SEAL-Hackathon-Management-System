import { Router } from "express";
import Round from "../models/Round.js";
import Contest from "../models/Contest.js";
import Team from "../models/Team.js";
import Score from "../models/Score.js";

const router = Router();

router.get("/:round_id", async (req, res, next) => {
  try {
    const { round_id } = req.params;

    // 1. Fetch round
    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vòng thi",
      });
    }

    // 2. Fetch contest
    const contest = await Contest.findById(round.contest_id);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giải đấu",
      });
    }

    // 3. Check wildcard configurations
    if (!contest.wildcard_enabled || !round.wildcard_enabled) {
      let reason = "";
      if (!contest.wildcard_enabled && !round.wildcard_enabled) {
        reason = "Chức năng Wild Card chưa được kích hoạt ở cả cấu hình chung (Contest) và vòng thi (Round).";
      } else if (!contest.wildcard_enabled) {
        reason = "Chức năng Wild Card chưa được kích hoạt ở cấu hình chung (Contest).";
      } else {
        reason = "Chức năng Wild Card chưa được kích hoạt ở vòng thi (Round).";
      }

      return res.status(200).json({
        eligible: false,
        reason
      });
    }

    const boundary = round.top_n || 6;
    const wildcardCount = round.wildcard_count || 1;

    // 4. Find active teams in the contest
    const teams = await Team.find({
      contest_id: round.contest_id,
      status: "ACTIVE",
    });

    // 5. Find all final normal scores for this round
    const scores = await Score.find({
      round_id: round_id,
      score_type: "NORMAL",
      is_final: true,
    });

    // Group scores by team_id
    const scoreMap = {};
    for (const score of scores) {
      const teamIdStr = score.team_id.toString();
      if (!scoreMap[teamIdStr]) {
        scoreMap[teamIdStr] = [];
      }
      scoreMap[teamIdStr].push(score.weighted_avg_score || 0);
    }

    // Calculate average score for each team
    const teamList = [];
    for (const team of teams) {
      const teamScores = scoreMap[team._id.toString()];
      if (!teamScores || teamScores.length === 0) {
        teamList.push({
          team_id: team._id,
          team_name: team.team_name || team.name || "Unknown Team",
          assigned_group: team.assigned_group || "Chưa phân bảng",
          weighted_avg_score: 0,
        });
        continue;
      }
      const avgScore = teamScores.reduce((sum, val) => sum + val, 0) / teamScores.length;
      teamList.push({
        team_id: team._id,
        team_name: team.team_name || team.name || "Unknown Team",
        assigned_group: team.assigned_group || "Chưa phân bảng",
        weighted_avg_score: Math.round(avgScore * 100) / 100,
      });
    }

    // Group teams by assigned_group to rank them in-group
    const groupsMap = {};
    for (const team of teamList) {
      const groupName = team.assigned_group || "Chưa phân bảng";
      if (!groupsMap[groupName]) {
        groupsMap[groupName] = [];
      }
      groupsMap[groupName].push(team);
    }

    const nonTopNTeams = [];

    for (const [groupName, groupTeams] of Object.entries(groupsMap)) {
      // Sort teams in each group by weighted_avg_score DESC
      groupTeams.sort((a, b) => b.weighted_avg_score - a.weighted_avg_score);

      // Assign in-group rank and filter non-Top N teams
      groupTeams.forEach((team, index) => {
        const rankInGroup = index + 1;
        if (rankInGroup > boundary) {
          nonTopNTeams.push({
            ...team,
            rank_in_group: rankInGroup,
          });
        }
      });
    }

    // Sort cross-group candidates by weighted_avg_score DESC
    nonTopNTeams.sort((a, b) => b.weighted_avg_score - a.weighted_avg_score);

    // Get the top wildcard_count teams
    const candidates = nonTopNTeams.slice(0, wildcardCount);

    return res.status(200).json({
      eligible: true,
      wildcard_count: wildcardCount,
      candidates: candidates.map(t => ({
        team_id: t.team_id,
        team_name: t.team_name,
        assigned_group: t.assigned_group,
        weighted_avg_score: t.weighted_avg_score,
        rank_in_group: t.rank_in_group
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
