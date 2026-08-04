import {
  calculateRankings,
  getRankings,
  getLeaderboard,
} from "../services/rankingService.js";
import { buildRoundResultsWorkbook } from "../services/exportService.js";

export const recalculate = async (req, res, next) => {
  try {
    const { contestId, roundId } = req.params;
    const rankings = await calculateRankings(contestId, roundId);
    res.json({ message: "Tính xếp hạng thành công", rankings });
  } catch (e) { next(e); }
};

export const list = async (req, res, next) => {
  try {
    const { contestId, roundId } = req.params;
    const { pool_id } = req.query;
    const rankings = await getRankings(contestId, roundId, { pool_id });
    res.json(rankings);
  } catch (e) { next(e); }
};

export const leaderboard = async (req, res, next) => {
  try {
    const { contestId, roundId } = req.params;
    const data = await getLeaderboard(contestId, roundId);
    res.json(data);
  } catch (e) { next(e); }
};

export const exportExcel = async (req, res, next) => {
  try {
    const { contestId, roundId } = req.params;
    const { workbook, fileName } = await buildRoundResultsWorkbook(contestId, roundId);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) { next(e); }
};
