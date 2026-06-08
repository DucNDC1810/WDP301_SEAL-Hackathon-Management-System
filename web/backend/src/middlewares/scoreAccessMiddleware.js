import Contest from "../models/Contest.js";

export const blockContestantScoreAccess = async (req, res, next) => {
  try {
    const isContestant = req.user.roles.some((r) => r.role_name === "contestant");
    if (!isContestant) return next();

    const contestId = req.params.contestId;
    const contest = await Contest.findById(contestId).select("status");
    if (!contest) {
      return res.status(404).json({ message: "Không tìm thấy cuộc thi" });
    }
    if (contest.status !== "closed") {
      return res.status(403).json({ message: "Kết quả chưa được công bố" });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
