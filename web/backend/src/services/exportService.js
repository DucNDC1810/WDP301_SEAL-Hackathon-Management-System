import ExcelJS from "exceljs";
import Contest from "../models/Contest.js";
import { getRankings } from "./rankingService.js";
import { getScoresByRound } from "./scoreService.js";

/**
 * Tạo workbook Excel gồm 2 sheet cho 1 round:
 * - "Bảng xếp hạng": hạng, đội, bảng đấu, điểm trung bình cuối
 * - "Chi tiết điểm": từng giám khảo chấm từng đội theo từng tiêu chí
 */
export const buildRoundResultsWorkbook = async (contestId, roundId) => {
  const contest = await Contest.findById(contestId).select("title rounds").lean();
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }
  const round = contest.rounds.find((r) => r._id.toString() === roundId.toString());
  const roundName = round?.name || "Vòng thi";

  const [rankings, scores] = await Promise.all([
    getRankings(contestId, roundId),
    getScoresByRound(contestId, roundId, { score_type: "NORMAL" }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SEAL Hackathon";
  workbook.created = new Date();

  // ── Sheet 1: Bảng xếp hạng ─────────────────────────────────────────────
  const rankSheet = workbook.addWorksheet("Bảng xếp hạng");
  rankSheet.columns = [
    { header: "Hạng", key: "rank", width: 8 },
    { header: "Đội thi", key: "team", width: 30 },
    { header: "Bảng đấu", key: "pool", width: 20 },
    { header: "Điểm trung bình", key: "score", width: 16 },
    { header: "Qualified", key: "qualified", width: 12 },
  ];
  rankSheet.getRow(1).font = { bold: true };
  rankSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCEEFF" } };

  for (const r of rankings) {
    rankSheet.addRow({
      rank: r.rank_position,
      team: r.team_id?.team_name || r.team_name || "—",
      pool: r.board_id?.pool_name || "—",
      score: r.final_score != null ? Number(r.final_score.toFixed(2)) : 0,
      qualified: r.qualified ? "Có" : "Không",
    });
  }

  // ── Sheet 2: Chi tiết điểm từng giám khảo ──────────────────────────────
  const detailSheet = workbook.addWorksheet("Chi tiết điểm");

  // Thu thập toàn bộ tên tiêu chí xuất hiện để làm cột động
  const criteriaNames = [];
  for (const s of scores) {
    for (const c of s.criteria_scores || []) {
      if (!criteriaNames.includes(c.criteria_name)) criteriaNames.push(c.criteria_name);
    }
  }

  detailSheet.columns = [
    { header: "Đội thi", key: "team", width: 28 },
    { header: "Giám khảo", key: "judge", width: 24 },
    ...criteriaNames.map((name, idx) => ({ header: name, key: `crit_${idx}`, width: 16 })),
    { header: "Điểm trọng số TB", key: "weighted", width: 16 },
    { header: "Trạng thái", key: "status", width: 12 },
    { header: "Nhận xét", key: "comment", width: 30 },
  ];
  detailSheet.getRow(1).font = { bold: true };
  detailSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCEEFF" } };

  for (const s of scores) {
    const row = {
      team: s.team_id?.team_name || "—",
      judge: s.judge_id?.full_name || s.judge_id?.email || "—",
      weighted: s.weighted_avg_score != null ? Number(s.weighted_avg_score.toFixed(2)) : 0,
      status: s.status === "submitted" ? "Đã nộp" : "Nháp",
      comment: s.comment || "",
    };
    criteriaNames.forEach((name, idx) => {
      const found = (s.criteria_scores || []).find((c) => c.criteria_name === name);
      row[`crit_${idx}`] = found ? found.score : "";
    });
    detailSheet.addRow(row);
  }

  return { workbook, fileName: `${contest.title}-${roundName}-KetQua`.replace(/[^\w\-]+/g, "_") };
};
