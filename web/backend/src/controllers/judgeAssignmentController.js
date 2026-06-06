import {
  assignJudge,
  removeJudgeAssignment,
  getJudgeAssignmentsByRound,
  getMyJudgeAssignments,
} from "../services/judgeAssignmentService.js";

export const assign = async (req, res, next) => {
  try {
    const { contestId, roundId } = req.params;
    const { pool_id, team_id, judge_id, judge_type } = req.body;
    const result = await assignJudge({
      contest_id: contestId,
      round_id:   roundId,
      pool_id,
      team_id,
      judge_id,
      judge_type,
      assigned_by: req.user._id,
    });
    res.status(201).json({ message: "Phân công judge thành công", ...result });
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    await removeJudgeAssignment(req.params.assignmentId);
    res.json({ message: "Hủy phân công thành công" });
  } catch (e) { next(e); }
};

export const getByRound = async (req, res, next) => {
  try {
    const { contestId, roundId } = req.params;
    const assignments = await getJudgeAssignmentsByRound(contestId, roundId);
    res.json(assignments);
  } catch (e) { next(e); }
};

export const getMyAssignments = async (req, res, next) => {
  try {
    const { contestId, roundId } = req.query;
    const assignments = await getMyJudgeAssignments(req.user._id, contestId, roundId);
    res.json(assignments);
  } catch (e) { next(e); }
};
