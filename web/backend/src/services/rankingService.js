import Score from "../models/Score.js";
import ScoreDetail from "../models/ScoreDetail.js";
import Ranking from "../models/Ranking.js";
import Team from "../models/Team.js";
import Contest from "../models/Contest.js";
import { getIO } from "../socket/index.js";

export const calculateRankings = async (contestId, roundId) => {
  const scores = await Score.find({
    contest_id: contestId,
    round_id: roundId,
    status: "submitted",
  });

  if (scores.length === 0) {
    const err = new Error("Chưa có điểm nào được nộp"); err.statusCode = 400; throw err;
  }

  const scoreIds = scores.map((s) => s._id);
  const allDetails = await ScoreDetail.find({ score_id: { $in: scoreIds } });

  const detailMap = {};
  for (const d of allDetails) {
    const key = d.score_id.toString();
    if (!detailMap[key]) detailMap[key] = [];
    detailMap[key].push(d);
  }

  const scoreByTeam = {};
  for (const score of scores) {
    const details = detailMap[score._id.toString()] || [];
    let weightedSum = 0, totalWeight = 0;
    for (const d of details) {
      weightedSum += d.score_value * d.weight;
      totalWeight += d.weight;
    }
    const computed = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const teamKey = score.team_id.toString();
    if (!scoreByTeam[teamKey]) {
      scoreByTeam[teamKey] = { scores: [], teamId: score.team_id };
    }
    scoreByTeam[teamKey].scores.push(computed);
  }

  const teamIds = Object.keys(scoreByTeam);
  const teams = await Team.find({ _id: { $in: teamIds } }).select("team_name pool_id");
  const teamMap = {};
  for (const t of teams) teamMap[t._id.toString()] = t;

  const contest = await Contest.findById(contestId).select("max_teams_per_pool");
  const topN = contest?.max_teams_per_pool || 3;

  const entries = Object.entries(scoreByTeam).map(([teamKey, val]) => {
    const avg = val.scores.reduce((a, b) => a + b, 0) / val.scores.length;
    const team = teamMap[teamKey];
    return {
      team_id: val.teamId,
      team_name: team?.team_name || "Unknown",
      board_id: team?.pool_id || null,
      final_score: Math.round(avg * 100) / 100,
    };
  });

  entries.sort((a, b) => b.final_score - a.final_score);

  const rankingDocs = entries.map((e, i) => ({
    contest_id: contestId,
    round_id: roundId,
    board_id: e.board_id,
    team_id: e.team_id,
    team_name: e.team_name,
    final_score: e.final_score,
    rank_position: i + 1,
    qualified: i < topN,
    calculated_at: new Date(),
  }));

  await Ranking.deleteMany({ contest_id: contestId, round_id: roundId });
  const saved = await Ranking.insertMany(rankingDocs);

  try {
    const io = getIO();
    io.to(`contest:${contestId}:round:${roundId}`).emit("ranking:updated", { rankings: saved });
  } catch (_) { /* socket not connected, ignore */ }

  return saved;
};

export const getRankings = async (contestId, roundId) => {
  return Ranking.find({ contest_id: contestId, round_id: roundId })
    .sort({ rank_position: 1 })
    .populate("team_id",  "team_name")
    .populate("board_id", "pool_name");
};
