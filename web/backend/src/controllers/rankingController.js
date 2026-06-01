import * as service from "../services/rankingService.js";

export const handleCalculateRankings = async (req, res) => {
  try {
    const { contestId, roundId } = req.params;
    const rankings = await service.calculateRankings(contestId, roundId);
    res.json({ message: "Xếp hạng đã được tính toán", count: rankings.length, rankings });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleGetRankings = async (req, res) => {
  try {
    const { contestId, roundId } = req.params;
    const rankings = await service.getRankings(contestId, roundId);
    res.json(rankings);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};
