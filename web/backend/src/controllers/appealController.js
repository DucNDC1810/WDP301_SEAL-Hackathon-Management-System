import * as service from "../services/appealService.js";

export const handleCreateAppeal = async (req, res) => {
  try {
    const { contest_id, round_id, content, team_id } = req.body;
    const appeal = await service.createAppeal({ team_id, contest_id, round_id, content });
    res.status(201).json(appeal);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleGetAppeals = async (req, res) => {
  try {
    const { contestId } = req.params;
    const appeals = await service.getAppealsByContest(contestId);
    res.json(appeals);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleGetMyAppeals = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { team_id } = req.query;
    const appeals = await service.getMyAppeals(team_id, contestId);
    res.json(appeals);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleResolveAppeal = async (req, res) => {
  try {
    const { resolution } = req.body;
    const appeal = await service.resolveAppeal(req.params.id, resolution, req.user._id);
    res.json(appeal);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};
