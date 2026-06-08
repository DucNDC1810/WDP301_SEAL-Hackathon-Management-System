import * as service from "../services/scoreService.js";
import ScoreDetail from "../models/ScoreDetail.js";

export const handleCreateScore = async (req, res) => {
  try {
    const { team_id, contest_id, round_id, comment, score_details, submit } = req.body;
    const score = await service.createScore({
      team_id, mentor_id: req.user._id, contest_id, round_id,
      comment, score_details, submit: submit === true,
    });
    res.status(201).json(score);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleUpdateScore = async (req, res) => {
  try {
    const { comment, score_details, submit } = req.body;
    const score = await service.updateScore(req.params.id, req.user._id, {
      comment, score_details, submit: submit === true,
    });
    res.json(score);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleGetProgress = async (req, res) => {
  try {
    const { contestId, roundId } = req.params;
    const progress = await service.getScoringProgress(contestId, roundId);
    res.json(progress);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleGetMyScores = async (req, res) => {
  try {
    const { contestId, roundId } = req.params;
    const scores = await service.getMyScores(contestId, roundId, req.user._id);
    res.json(scores);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};
