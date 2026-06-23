import { Router } from "express";
import Round from "../models/Round.js";
import Score from "../models/Score.js";
import Team from "../models/Team.js";
import Contest from "../models/Contest.js";
import Submission from "../models/Submission.js";

const router = Router();

// GET /api/leaderboard/contests/:contest_id/rounds
router.get("/contests/:contest_id/rounds", async (req, res, next) => {
  try {
    const { contest_id } = req.params;
    let rounds = await Round.find({ contest_id }).sort({ round_start: 1 });

    if (rounds.length === 0) {
      const contest = await Contest.findById(contest_id);
      if (contest && contest.rounds && contest.rounds.length > 0) {
        const createdRounds = [];
        for (const r of contest.rounds) {
          let existingRound = await Round.findOne({ contest_id, name: r.name });
          if (!existingRound) {
            existingRound = await Round.create({
              _id: r._id,
              contest_id,
              name: r.name,
              type: r.round_number === 2 || r.name.toLowerCase().includes("chung kết") || r.name.toLowerCase().includes("final") ? "FINAL" : "PRELIMINARY",
              is_active: r.is_active,
              round_start: r.start_time || new Date(),
              round_end: r.end_time || r.submission_deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
          }
          createdRounds.push(existingRound);
        }
        rounds = createdRounds;
      }
    }

    return res.status(200).json({
      success: true,
      data: rounds
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/leaderboard/:round_id/tiebreak
router.get("/:round_id/tiebreak", async (req, res, next) => {
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

    const boundary = round.top_n || 6;

    // 2. Fetch all submissions to build the submission time map
    const submissions = await Submission.find({ round_id });
    const submissionMap = {};
    for (const sub of submissions) {
      submissionMap[sub.team_id.toString()] = sub.submitted_at || sub.created_at || null;
    }

    // 3. Find active teams in the contest
    const teams = await Team.find({
      contest_id: round.contest_id,
      status: "ACTIVE",
    });

    // 4. Find all final normal scores for this round
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
        continue;
      }
      const avgScore = teamScores.reduce((sum, val) => sum + val, 0) / teamScores.length;
      teamList.push({
        team_id: team._id,
        team_name: team.team_name || team.name || "Unknown Team",
        assigned_group: team.assigned_group || "Chưa phân bảng",
        weighted_avg_score: Math.round(avgScore * 100) / 100,
        tiebreak_rule: team.tiebreak_rule || null,
        tiebreak_status: team.tiebreak_status || null,
        penalty_score: team.penalty_score || 0,
      });
    }

    // Group teams by assigned_group
    const groupsMap = {};
    for (const team of teamList) {
      const groupName = team.assigned_group || "Chưa phân bảng";
      if (!groupsMap[groupName]) {
        groupsMap[groupName] = [];
      }
      groupsMap[groupName].push(team);
    }

    const tiebreak_groups = [];

    for (const [groupName, groupTeams] of Object.entries(groupsMap)) {
      // Sort teams in each group by weighted_avg_score DESC
      groupTeams.sort((a, b) => b.weighted_avg_score - a.weighted_avg_score);

      // Check if we have teams spanning across the boundary
      if (groupTeams.length > boundary) {
        const teamAtBoundary = groupTeams[boundary - 1];
        const teamJustAfterBoundary = groupTeams[boundary];

        if (teamAtBoundary.weighted_avg_score === teamJustAfterBoundary.weighted_avg_score) {
          const tiedScore = teamAtBoundary.weighted_avg_score;
          // Filter all teams in this group that have this exact score
          const tiedTeamsInGroup = groupTeams.filter(t => t.weighted_avg_score === tiedScore);

          tiebreak_groups.push({
            group_name: groupName,
            boundary_rank: boundary,
            tied_teams: tiedTeamsInGroup.map(t => ({
              team_id: t.team_id,
              team_name: t.team_name,
              weighted_avg_score: t.weighted_avg_score,
              tiebreak_rule: t.tiebreak_rule,
              tiebreak_status: t.tiebreak_status,
              penalty_score: t.penalty_score,
              submission_time: submissionMap[t.team_id.toString()] || null
            }))
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      tiebreak_groups
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/leaderboard/:round_id/tiebreak/apply
// Body: { group_name: "A" }
// Tự động áp dụng tiebreak_rule cho group đó và cập nhật tiebreak_status các đội
router.post("/:round_id/tiebreak/apply", async (req, res, next) => {
  try {
    const { round_id } = req.params;
    const { group_name } = req.body;

    if (!group_name) {
      return res.status(400).json({ success: false, message: "Thiếu group_name" });
    }

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
    }

    const boundary = round.top_n || 6;

    // Lấy tất cả đội trong group này
    const teams = await Team.find({
      contest_id: round.contest_id,
      status: "ACTIVE",
      assigned_group: group_name,
    });

    // Lấy điểm số
    const scores = await Score.find({
      round_id,
      score_type: "NORMAL",
      is_final: true,
    });
    const scoreMap = {};
    for (const score of scores) {
      const key = score.team_id.toString();
      if (!scoreMap[key]) scoreMap[key] = [];
      scoreMap[key].push(score.weighted_avg_score || 0);
    }

    // Lấy submission time
    const submissions = await Submission.find({ round_id });
    const submissionMap = {};
    for (const sub of submissions) {
      submissionMap[sub.team_id.toString()] = sub.submitted_at || sub.created_at || null;
    }

    // Build teamList với đầy đủ thông tin
    const teamList = teams.map((team) => {
      const teamScores = scoreMap[team._id.toString()] || [];
      const avgScore = teamScores.length
        ? teamScores.reduce((s, v) => s + v, 0) / teamScores.length
        : 0;
      return {
        _id: team._id,
        team_name: team.team_name,
        weighted_avg_score: Math.round(avgScore * 100) / 100,
        tiebreak_rule: team.tiebreak_rule,
        penalty_score: team.penalty_score || 0,
        submission_time: submissionMap[team._id.toString()] || null,
      };
    });

    // Sort DESC theo điểm
    teamList.sort((a, b) => b.weighted_avg_score - a.weighted_avg_score);

    if (teamList.length <= boundary) {
      return res.status(400).json({ success: false, message: "Không đủ điều kiện áp dụng tiebreak (số đội <= ranh giới)" });
    }

    const teamAtBoundary = teamList[boundary - 1];
    const teamJustAfter = teamList[boundary];

    if (teamAtBoundary.weighted_avg_score !== teamJustAfter.weighted_avg_score) {
      return res.status(400).json({ success: false, message: "Không có tình trạng đồng điểm tại ranh giới" });
    }

    const tiedScore = teamAtBoundary.weighted_avg_score;
    const tiedTeams = teamList.filter((t) => t.weighted_avg_score === tiedScore);

    // Xác định rule chung của group (lấy từ đội đầu tiên)
    const rule = tiedTeams[0]?.tiebreak_rule;

    const updates = [];

    if (rule === "PENALTY_SCORE") {
      // Đội penalty thấp hơn (ít bị trừ hơn) → RESOLVED, đội còn lại → giữ PENDING
      // Nếu vẫn bằng nhau → leo lên COORDINATOR_DECISION
      const minPenalty = Math.min(...tiedTeams.map((t) => t.penalty_score));
      const winners = tiedTeams.filter((t) => t.penalty_score === minPenalty);
      const losers = tiedTeams.filter((t) => t.penalty_score !== minPenalty);

      for (const team of winners) {
        updates.push(
          Team.findByIdAndUpdate(team._id, {
            tiebreak_status: "RESOLVED",
          })
        );
      }
      for (const team of losers) {
        updates.push(
          Team.findByIdAndUpdate(team._id, {
            tiebreak_status: "RESOLVED",
          })
        );
      }

      // Nếu tất cả bằng nhau về penalty → escalate
      if (losers.length === 0) {
        for (const team of winners) {
          updates.push(
            Team.findByIdAndUpdate(team._id, {
              tiebreak_rule: "COORDINATOR_DECISION",
              tiebreak_status: "ESCALATED",
            })
          );
        }
      }
    } else if (rule === "SUBMISSION_TIME") {
      // Đội nộp sớm hơn → RESOLVED
      const sorted = [...tiedTeams].sort((a, b) => {
        if (!a.submission_time) return 1;
        if (!b.submission_time) return -1;
        return new Date(a.submission_time) - new Date(b.submission_time);
      });

      const earliest = new Date(sorted[0].submission_time).getTime();
      const winners = sorted.filter(
        (t) => t.submission_time && new Date(t.submission_time).getTime() === earliest
      );
      const losers = sorted.filter(
        (t) => !t.submission_time || new Date(t.submission_time).getTime() !== earliest
      );

      for (const team of [...winners, ...losers]) {
        updates.push(
          Team.findByIdAndUpdate(team._id, { tiebreak_status: "RESOLVED" })
        );
      }

      // Vẫn tie về time → escalate
      if (losers.length === 0) {
        for (const team of winners) {
          updates.push(
            Team.findByIdAndUpdate(team._id, {
              tiebreak_rule: "COORDINATOR_DECISION",
              tiebreak_status: "ESCALATED",
            })
          );
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        message: `Luật "${rule}" cần BTC quyết định thủ công, hệ thống không thể tự xử lý.`,
      });
    }

    await Promise.all(updates);

    return res.status(200).json({
      success: true,
      message: `Đã áp dụng luật ${rule} cho bảng ${group_name} thành công.`,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/leaderboard/:round_id
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

    // 2. Check if active (published)
    if (!round.is_active && req.query.admin !== "true") {
      return res.status(403).json({
        success: false,
        message: "Vòng thi chưa được công bố",
      });
    }

    // 3. Find active teams in the contest
    const teams = await Team.find({
      contest_id: round.contest_id,
      status: "ACTIVE",
    });

    // 4. Find all final normal scores for this round
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

    // Calculate average score for each team and map properties
    const teamList = [];
    for (const team of teams) {
      const teamScores = scoreMap[team._id.toString()];
      if (!teamScores || teamScores.length === 0) {
        // Exclude teams without final scores or default them? 
        // Let's include them with score 0 so they still appear on the leaderboard, or exclude them.
        // The prompt says "Chỉ lấy scores có score_type = NORMAL và is_final = true"
        // Let's exclude teams that don't have any final scores to match "Chỉ lấy scores..."
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

    // 5. Group teams by assigned_group
    const groupsMap = {};
    for (const team of teamList) {
      const groupName = team.assigned_group || "Chưa phân bảng";
      if (!groupsMap[groupName]) {
        groupsMap[groupName] = [];
      }
      groupsMap[groupName].push(team);
    }

    const groups = [];
    for (const [groupName, groupTeams] of Object.entries(groupsMap)) {
      // Sort teams in each group by weighted_avg_score DESC
      groupTeams.sort((a, b) => b.weighted_avg_score - a.weighted_avg_score);

      // Assign rank
      const rankedTeams = groupTeams.map((team, index) => ({
        rank: index + 1,
        team_id: team.team_id,
        team_name: team.team_name,
        assigned_group: team.assigned_group,
        weighted_avg_score: team.weighted_avg_score,
      }));

      groups.push({
        group_name: groupName,
        teams: rankedTeams,
      });
    }

    // 6. Return response shape
    return res.status(200).json({
      round_id: round._id,
      round_name: round.name,
      groups,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
