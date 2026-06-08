import {
  activateRound,
  deactivateRound,
  lockScoring,
  getRoundStatus,
  releaseProblem as releaseProblemService,
  checkJudgeCompletion,
} from "../services/roundService.js";

export const activate = async (req, res, next) => {
  try {
    const { contestId, roundId } = req.params;
    const round = await activateRound(contestId, roundId, req.user._id);
    res.json({ message: "Kích hoạt vòng thi thành công", round });
  } catch (e) { next(e); }
};

export const deactivate = async (req, res, next) => {
  try {
    const { contestId, roundId } = req.params;
    const round = await deactivateRound(contestId, roundId);
    res.json({ message: "Hủy kích hoạt vòng thi thành công", round });
  } catch (e) { next(e); }
};

export const lock = async (req, res, next) => {
  try {
    const { contestId, roundId } = req.params;
    const { force, force_lock_reason } = req.body;
    const round = await lockScoring(contestId, roundId, { force, force_lock_reason });
    res.json({ message: "Khóa chấm điểm thành công", round });
  } catch (e) { next(e); }
};

export const getStatus = async (req, res, next) => {
  try {
    const { contestId, roundId } = req.params;
    const status = await getRoundStatus(contestId, roundId);
    res.json(status);
  } catch (e) { next(e); }
};

export const releaseProblem = async (req, res, next) => {
  try {
    const { roundId } = req.params;
    const round = await releaseProblemService(roundId, req.user._id);
    res.json({ message: "Đã phát đề thành công", round });
  } catch (e) { next(e); }
};

export const judgeCompletion = async (req, res, next) => {
  try {
    const { roundId } = req.params;
    const result = await checkJudgeCompletion(roundId);
    res.json(result);
  } catch (e) { next(e); }
};
