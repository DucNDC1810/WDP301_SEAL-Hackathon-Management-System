import { Router } from "express";
import Round from "../models/Round.js";
import Team from "../models/Team.js";
import Score from "../models/Score.js";
import Criteria from "../models/Criteria.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = Router();

// GET /api/calibration/:round_id
router.get("/:round_id", authenticate, async (req, res, next) => {
  try {
    const { round_id } = req.params;

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
    }

    // 1. Get sample teams
    const sampleTeams = await Team.find({
      contest_id: round.contest_id,
      is_calibration_sample: true
    }).select("_id team_name name");

    const formattedSampleTeams = sampleTeams.map(t => ({
      team_id: t._id,
      team_name: t.name || t.team_name
    }));

    // 2. Get calibration scores for this round
    const scores = await Score.find({
      round_id,
      score_type: "CALIBRATION"
    }).populate("judge_id", "full_name email");

    const formattedScores = scores.map(s => ({
      judge_id: s.judge_id?._id || s.judge_id,
      judge_name: s.judge_id?.full_name || "Unknown Judge",
      team_id: s.team_id,
      criteria_scores: s.criteria_scores,
      weighted_avg_score: s.weighted_avg_score
    }));

    // 3. Get criteria of this round to compute distribution
    const criteriaList = await Criteria.find({ round_id });

    const distribution = criteriaList.map(crit => {
      const scoresForCrit = [];
      scores.forEach(s => {
        const found = s.criteria_scores.find(cs => cs.criteria_name === crit.name);
        if (found && found.score !== undefined) {
          scoresForCrit.push(found.score);
        }
      });
      return {
        criteria_name: crit.name,
        scores: scoresForCrit
      };
    });

    return res.status(200).json({
      round_id,
      sample_teams: formattedSampleTeams,
      scores: formattedScores,
      distribution,
      criteria: criteriaList
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/calibration/:round_id/score
router.post("/:round_id/score", authenticate, async (req, res, next) => {
  try {
    const { round_id } = req.params;
    const { judge_id, team_id, criteria_scores } = req.body;

    const round = await Round.findById(round_id);
    if (!round) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
    }

    const finalJudgeId = judge_id || req.user?._id;
    if (!finalJudgeId) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin giám khảo (judge_id)" });
    }

    const criteriaList = await Criteria.find({ round_id });
    if (!criteriaList || criteriaList.length === 0) {
      return res.status(400).json({ success: false, message: "Vòng thi này chưa được cấu hình tiêu chí chấm điểm" });
    }

    let totalWeightedScore = 0;
    let totalWeight = 0;
    const formattedCriteriaScores = [];

    for (const cs of criteria_scores) {
      const critDef = criteriaList.find(c => String(c._id) === String(cs.criteria_id));
      if (!critDef) {
        return res.status(400).json({
          success: false,
          message: `Không tìm thấy tiêu chí với ID ${cs.criteria_id} trong vòng thi này`
        });
      }
      const scoreVal = Number(cs.score);
      formattedCriteriaScores.push({
        criteria_name: critDef.name,
        weight: critDef.weight,
        score: scoreVal
      });
      totalWeightedScore += scoreVal * critDef.weight;
      totalWeight += critDef.weight;
    }

    const weighted_avg_score = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;

    const scoreDoc = await Score.findOneAndUpdate(
      {
        judge_id: finalJudgeId,
        team_id,
        round_id,
        score_type: "CALIBRATION"
      },
      {
        judge_id: finalJudgeId,
        team_id,
        contest_id: round.contest_id,
        round_id,
        criteria_scores: formattedCriteriaScores,
        weighted_avg_score: Math.round(weighted_avg_score * 100) / 100,
        score_type: "CALIBRATION",
        status: "submitted",
        is_final: false,
        submitted_at: new Date()
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      score: scoreDoc
    });
  } catch (error) {
    next(error);
  }
});

export default router;
