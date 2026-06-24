import express from "express";
import mongoose from "mongoose";
import Round from "../models/Round.js";
import Score from "../models/Score.js";
import Contest from "../models/Contest.js";
import JudgeAssignment from "../models/JudgeAssignment.js";
import Pool from "../models/Pool.js";

const router = express.Router();

// GET /api/rbl/rounds — danh sách tất cả rounds (mọi trạng thái) kèm tên contest
router.get("/rounds", async (req, res) => {
  try {
    const rounds = await Round.find({})
      .select("name status contest_id round_end updated_at")
      .sort({ updated_at: -1 })
      .lean();

    // Lấy tên contest
    const contestIds = [...new Set(rounds.map((r) => r.contest_id?.toString()).filter(Boolean))];
    const contests = await Contest.find({ _id: { $in: contestIds } })
      .select("title")
      .lean();
    const contestMap = Object.fromEntries(contests.map((c) => [c._id.toString(), c.title]));

    const data = rounds.map((r) => ({
      round_id:     r._id,
      round_name:   r.name,
      status:       r.status,
      contest_id:   r.contest_id,
      contest_name: contestMap[r.contest_id?.toString()] || "—",
      round_end:    r.round_end || r.updated_at,
    }));

    return res.json({ data });
  } catch (err) {
    console.error("[RBL] rounds error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// GET /api/rbl/:round_id/dashboard
router.get("/:round_id/dashboard", async (req, res) => {
  try {
    const { round_id } = req.params;

    const round = await Round.findById(round_id).lean();
    if (!round) {
      return res.status(404).json({ error: "ROUND_NOT_FOUND" });
    }
    if (round.status !== "FINISHED") {
      return res.status(403).json({ error: "NOT_FINISHED" });
    }

    // Lấy tất cả score đã submitted của round này
    const scores = await Score.find({
      round_id,
      status: "submitted",
    })
      .select("judge_id team_id criteria_scores total_score")
      .lean();

    if (scores.length === 0) {
      return res.json({
        round_id,
        status: round.status,
        icc: null,
        krippendorff: null,
        score_distribution: [],
      });
    }

    // Ẩn danh: map judge_id → judge_index, team_id → team_index
    const judgeIdSet = [...new Set(scores.map((s) => s.judge_id.toString()))];
    const teamIdSet = [...new Set(scores.map((s) => s.team_id.toString()))];

    const judgeIndexMap = Object.fromEntries(
      judgeIdSet.map((id, i) => [id, i + 1])
    );
    const teamIndexMap = Object.fromEntries(
      teamIdSet.map((id, i) => [id, i + 1])
    );

    // Gom điểm theo criteria
    const criteriaMap = {};
    for (const score of scores) {
      const jIdx = judgeIndexMap[score.judge_id.toString()];
      const tIdx = teamIndexMap[score.team_id.toString()];
      for (const cs of score.criteria_scores || []) {
        if (!criteriaMap[cs.criteria_name]) {
          criteriaMap[cs.criteria_name] = [];
        }
        criteriaMap[cs.criteria_name].push({
          judge_index: jIdx,
          team_index: tIdx,
          score: cs.score,
        });
      }
    }

    const scoreDistribution = Object.entries(criteriaMap).map(
      ([criteria_name, data_points]) => ({ criteria_name, data_points })
    );

    // Tính ICC (Two-way mixed, absolute agreement) nếu đủ dữ liệu
    let icc = null;
    let krippendorff = null;

    const nJudges = judgeIdSet.length;
    const nTeams = teamIdSet.length;

    if (nJudges >= 2 && nTeams >= 2) {
      // Xây dựng ma trận điểm tổng [team][judge] từ total_score
      const matrix = buildRatingMatrix(scores, judgeIdSet, teamIdSet);
      icc = computeICC(matrix, nTeams, nJudges);
      krippendorff = computeKrippendorffAlpha(matrix, nTeams, nJudges);
    }

    return res.json({
      round_id,
      status: round.status,
      icc: icc !== null ? parseFloat(icc.toFixed(4)) : null,
      krippendorff: krippendorff !== null ? parseFloat(krippendorff.toFixed(4)) : null,
      score_distribution: scoreDistribution,
    });
  } catch (err) {
    console.error("[RBL] dashboard error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Xây dựng ma trận [nTeams x nJudges] với giá trị null nếu không có điểm.
 * Hàng = team, Cột = judge.
 */
function buildRatingMatrix(scores, judgeIdSet, teamIdSet) {
  const matrix = Array.from({ length: teamIdSet.length }, () =>
    Array(judgeIdSet.length).fill(null)
  );
  for (const s of scores) {
    const tIdx = teamIdSet.indexOf(s.team_id.toString());
    const jIdx = judgeIdSet.indexOf(s.judge_id.toString());
    if (tIdx >= 0 && jIdx >= 0) {
      matrix[tIdx][jIdx] = s.total_score;
    }
  }
  return matrix;
}

/**
 * ICC (2,1) — two-way mixed, absolute agreement.
 * Dùng ANOVA one-way approach đơn giản khi dữ liệu đầy đủ.
 * Trả null nếu không đủ phương sai.
 */
function computeICC(matrix, n, k) {
  // Chỉ tính những hàng đủ dữ liệu
  const complete = matrix.filter((row) => row.every((v) => v !== null));
  if (complete.length < 2) return null;

  const nc = complete.length;
  const grandMean =
    complete.flat().reduce((a, b) => a + b, 0) / (nc * k);

  // SS between subjects
  const rowMeans = complete.map(
    (row) => row.reduce((a, b) => a + b, 0) / k
  );
  const SSb = k * rowMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);

  // SS total
  const SSt = complete
    .flat()
    .reduce((s, v) => s + (v - grandMean) ** 2, 0);

  // SS within
  const SSw = SSt - SSb;

  const MSb = SSb / (nc - 1);
  const MSw = SSw / (nc * (k - 1));

  if (MSb + (k - 1) * MSw === 0) return null;

  const icc = (MSb - MSw) / (MSb + (k - 1) * MSw);
  return Math.max(0, Math.min(1, icc));
}

/**
 * Krippendorff's Alpha cho dữ liệu interval.
 * Trả null nếu không đủ.
 */
function computeKrippendorffAlpha(matrix, n, k) {
  // Thu thập tất cả cặp giá trị trong cùng một hàng (cùng team, khác judge)
  let Do = 0; // observed disagreement
  let De = 0; // expected disagreement
  let pairCount = 0;

  const allValues = matrix.flat().filter((v) => v !== null);
  const totalValues = allValues.length;
  if (totalValues < 4) return null;

  // Tính Do: trung bình bình phương hiệu trong từng unit
  for (const row of matrix) {
    const vals = row.filter((v) => v !== null);
    if (vals.length < 2) continue;
    for (let i = 0; i < vals.length; i++) {
      for (let j = i + 1; j < vals.length; j++) {
        Do += (vals[i] - vals[j]) ** 2;
        pairCount++;
      }
    }
  }
  if (pairCount === 0) return null;
  Do = Do / pairCount;

  // Tính De: kỳ vọng nếu chọn ngẫu nhiên
  let dePairs = 0;
  for (let i = 0; i < allValues.length; i++) {
    for (let j = i + 1; j < allValues.length; j++) {
      De += (allValues[i] - allValues[j]) ** 2;
      dePairs++;
    }
  }
  if (dePairs === 0 || De === 0) return null;
  De = De / dePairs;

  const alpha = 1 - Do / De;
  return Math.max(0, Math.min(1, alpha));
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/rbl/:round_id/seed-demo  — tạo dữ liệu demo cho dashboard RBL
// Xoá scores cũ của round này rồi insert mock data. CHỈ DÙNG ĐỂ TEST.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:round_id/seed-demo", async (req, res) => {
  try {
    const { round_id } = req.params;

    const round = await Round.findById(round_id).lean();
    if (!round) return res.status(404).json({ error: "ROUND_NOT_FOUND" });

    const contest_id = round.contest_id;

    // ── Lấy judge_ids thật từ JudgeAssignment (nếu có) ────────────────────
    const assignments = await JudgeAssignment.find({
      round_id,
      invitation_status: "active",
      judge_id: { $ne: null },
    })
      .select("judge_id")
      .lean();

    let judgeIds = assignments.map((a) => a.judge_id).filter(Boolean);

    // Bổ sung tới 4 judges bằng fake ObjectId nếu chưa đủ
    while (judgeIds.length < 4) {
      judgeIds.push(new mongoose.Types.ObjectId());
    }
    judgeIds = judgeIds.slice(0, 4); // tối đa 4

    // ── Lấy team_ids thật từ Pool (nếu có) ────────────────────────────────
    const pools = await Pool.find({ round_id }).select("teams").lean();
    let teamIds = pools.flatMap((p) => p.teams).filter(Boolean);

    // Bổ sung tới 6 teams bằng fake ObjectId nếu chưa đủ
    while (teamIds.length < 6) {
      teamIds.push(new mongoose.Types.ObjectId());
    }
    teamIds = teamIds.slice(0, 6); // tối đa 6

    // ── Tiêu chí demo ─────────────────────────────────────────────────────
    const CRITERIA = [
      { criteria_name: "Sáng tạo",      weight: 0.25 },
      { criteria_name: "Kỹ thuật",      weight: 0.30 },
      { criteria_name: "Trình bày",     weight: 0.20 },
      { criteria_name: "Tính thực tiễn", weight: 0.25 },
    ];

    // ── Xoá scores cũ của round để tránh duplicate ────────────────────────
    await Score.deleteMany({ round_id });

    // ── Tạo Score records: mỗi judge × mỗi team ──────────────────────────
    // Thêm nhiễu Gaussian để ICC ra giá trị thực tế (không phải 0 hay 1)
    function baseScore(teamIdx) {
      // Mỗi team có "năng lực" riêng (5-9)
      const base = [7.5, 8.2, 6.8, 9.0, 7.1, 8.6];
      return base[teamIdx % base.length];
    }
    function judgeNoise(judgeIdx) {
      // Mỗi judge có xu hướng khác nhau
      const bias = [0.3, -0.2, 0.5, -0.4];
      return bias[judgeIdx % bias.length];
    }
    function rand(min, max) {
      return min + Math.random() * (max - min);
    }

    const scoreDocs = [];
    for (let jIdx = 0; jIdx < judgeIds.length; jIdx++) {
      for (let tIdx = 0; tIdx < teamIds.length; tIdx++) {
        const base = baseScore(tIdx) + judgeNoise(jIdx);

        const criteriaScores = CRITERIA.map((c) => {
          const raw = Math.min(10, Math.max(1, base + rand(-0.8, 0.8)));
          return {
            criteria_name: c.criteria_name,
            weight: c.weight,
            score: parseFloat(raw.toFixed(1)),
          };
        });

        const weightedAvg = criteriaScores.reduce(
          (s, c) => s + c.score * c.weight, 0
        );

        scoreDocs.push({
          team_id:            teamIds[tIdx],
          judge_id:           judgeIds[jIdx],
          contest_id,
          round_id,
          criteria_scores:    criteriaScores,
          weighted_avg_score: parseFloat(weightedAvg.toFixed(2)),
          total_score:        parseFloat(weightedAvg.toFixed(2)),
          status:             "submitted",
          is_final:           true,
          submitted_at:       new Date(),
          score_type:         "NORMAL",
        });
      }
    }

    await Score.insertMany(scoreDocs);

    return res.json({
      message: "Demo data created",
      judges: judgeIds.length,
      teams:  teamIds.length,
      scores: scoreDocs.length,
    });
  } catch (err) {
    console.error("[RBL] seed-demo error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", detail: err.message });
  }
});

export default router;
