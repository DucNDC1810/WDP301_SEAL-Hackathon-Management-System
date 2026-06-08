import Score from "../models/Score.js";
import ScoreDetail from "../models/ScoreDetail.js";
import Ranking from "../models/Ranking.js";
import Team from "../models/Team.js";
import Contest from "../models/Contest.js";
import { getIO } from "../socket/index.js";

// ─── calculateRankings ────────────────────────────────────────────────────────

/**
 * Tính xếp hạng:
 * - Chỉ tính score_type=NORMAL (loại CALIBRATION + PENALTY)
 * - Weighted average: Σ(avg_judge_score_per_criterion × criterion.weight)
 * - PARTITION BY pool_id (mỗi pool xếp hạng độc lập)
 */
export const calculateRankings = async (contestId, roundId) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi"); err.statusCode = 404; throw err;
  }
  const round = contest.rounds.id(roundId);
  if (!round) {
    const err = new Error("Không tìm thấy vòng thi"); err.statusCode = 404; throw err;
  }

  // Criteria weight map từ contest definition
  const criteriaWeightMap = {};
  for (const c of round.score_criteria) {
    criteriaWeightMap[c.name] = { weight: c.weight, max_score: c.max_score };
  }

  // Lấy tất cả scores NORMAL đã submitted
  const scores = await Score.find({
    contest_id: contestId,
    round_id: roundId,
    status: "submitted",
    score_type: "NORMAL",
  });

  if (scores.length === 0) {
    const err = new Error("Chưa có điểm NORMAL nào được nộp"); err.statusCode = 400; throw err;
  }

  const scoreIds = scores.map((s) => s._id);
  const allDetails = await ScoreDetail.find({ score_id: { $in: scoreIds } });

  // Group details by score_id
  const detailsByScore = {};
  for (const d of allDetails) {
    const key = d.score_id.toString();
    if (!detailsByScore[key]) detailsByScore[key] = [];
    detailsByScore[key].push(d);
  }

  // Group scores by team_id → sau đó tính avg per criterion across judges
  const scoresByTeam = {};
  for (const score of scores) {
    const teamKey = score.team_id.toString();
    if (!scoresByTeam[teamKey]) scoresByTeam[teamKey] = { team_id: score.team_id, judgeDatas: [] };
    scoresByTeam[teamKey].judgeDatas.push(detailsByScore[score._id.toString()] || []);
  }

  const teamIds = Object.keys(scoresByTeam);
  const teams = await Team.find({ _id: { $in: teamIds } }).select("team_name pool_id");
  const teamMap = {};
  for (const t of teams) teamMap[t._id.toString()] = t;

  const topN = contest.max_teams_per_pool || 3;

  // Tính weighted average cho từng team
  const entries = [];
  for (const [teamKey, val] of Object.entries(scoresByTeam)) {
    const team = teamMap[teamKey];

    // Gom điểm từng judge theo criteria_name
    const criteriaScores = {}; // { criteria_name: [score_value, ...] }
    for (const judgeDetails of val.judgeDatas) {
      for (const d of judgeDetails) {
        if (!criteriaScores[d.criteria_name]) criteriaScores[d.criteria_name] = [];
        criteriaScores[d.criteria_name].push(d.score_value);
      }
    }

    // Weighted avg: Σ(avg_judge_score_for_criterion × criterion.weight)
    let finalScore = 0;
    for (const [name, scoreValues] of Object.entries(criteriaScores)) {
      const avgForCriterion = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
      const weight = criteriaWeightMap[name]?.weight ?? 0;
      finalScore += avgForCriterion * weight;
    }

    entries.push({
      team_id: val.team_id,
      team_name: team?.team_name || "Unknown",
      pool_id: team?.pool_id || null,
      final_score: Math.round(finalScore * 100) / 100,
    });
  }

  // PARTITION BY pool_id — xếp hạng trong từng pool độc lập
  const poolGroups = {};
  for (const e of entries) {
    const poolKey = e.pool_id ? e.pool_id.toString() : "__no_pool__";
    if (!poolGroups[poolKey]) poolGroups[poolKey] = [];
    poolGroups[poolKey].push(e);
  }

  const rankingDocs = [];
  for (const [poolKey, poolEntries] of Object.entries(poolGroups)) {
    poolEntries.sort((a, b) => b.final_score - a.final_score);
    poolEntries.forEach((e, i) => {
      rankingDocs.push({
        contest_id: contestId,
        round_id: roundId,
        board_id: e.pool_id,
        team_id: e.team_id,
        team_name: e.team_name,
        final_score: e.final_score,
        rank_position: i + 1,
        qualified: i < topN,
        calculated_at: new Date(),
      });
    });
  }

  await Ranking.deleteMany({ contest_id: contestId, round_id: roundId });
  const saved = await Ranking.insertMany(rankingDocs);

  // Push real-time
  try {
    getIO().to(`contest:${contestId}:round:${roundId}`).emit("ranking:updated", { rankings: saved });
  } catch (_) { /* socket not init */ }

  return saved;
};

// ─── getRankings ──────────────────────────────────────────────────────────────

export const getRankings = async (contestId, roundId, { pool_id } = {}) => {
  const query = { contest_id: contestId, round_id: roundId };
  if (pool_id) query.board_id = pool_id;

  return Ranking.find(query)
    .sort({ board_id: 1, rank_position: 1 })
    .populate("team_id",  "team_name")
    .populate("board_id", "pool_name");
};

// ─── getLeaderboard (realtime view) ──────────────────────────────────────────

/**
 * Leaderboard realtime — tính trực tiếp từ scores chưa cần lock.
 * Chỉ tính NORMAL, partition by pool.
 */
export const getLeaderboard = async (contestId, roundId) => {
  try {
    return await calculateRankings(contestId, roundId);
  } catch (e) {
    if (e.statusCode === 400) return []; // chưa có score
    throw e;
  }
};
