import * as service from "../services/appealService.js";

export const handleCreateAppeal = async (req, res) => {
  try {
    const { contest_id, round_id, content } = req.body;
    // team_id is resolved server-side from the caller's own membership —
    // never trust a client-supplied team_id (a student could otherwise file
    // an appeal on behalf of another team).
    const appeal = await service.createAppeal({ contest_id, round_id, content, userId: req.user._id });
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
    // team_id is resolved server-side from req.user, ignoring any client-
    // supplied query param — otherwise a caller could read another team's
    // appeals, or read the whole contest's appeals by omitting it.
    const appeals = await service.getMyAppeals(contestId, req.user._id);
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
