import Team from "../models/Team.js";
import { getTeamGitStats } from "../services/teamGitStatsService.js";

/**
 * GET /api/teams/:teamId/rounds/:roundId/git-stats
 * Only a member of the team (or an admin) may read it. This route MAY call
 * GitHub when the cache is cold — see the service's allowFetch flag.
 */
export const handleGetTeamGitStats = async (req, res) => {
  try {
    const { teamId, roundId } = req.params;
    const isAdmin = (req.user.roles ?? []).some((r) => r.role_name === "admin");

    if (!isAdmin) {
      const team = await Team.findById(teamId).select("leader_id members").lean();
      if (!team) return res.status(404).json({ success: false, message: "Không tìm thấy đội" });
      const uid = req.user._id.toString();
      const belongs =
        team.leader_id?.toString() === uid ||
        (team.members ?? []).some(
          (m) => m.user_id?.toString() === uid || m.email === req.user.email
        );
      if (!belongs) {
        return res.status(403).json({ success: false, message: "Bạn không thuộc đội này" });
      }
    }

    const data = await getTeamGitStats({ teamId, roundId, allowFetch: true });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[handleGetTeamGitStats]", err);
    res.status(err.statusCode || 500).json({ success: false, message: err.message || "Lỗi máy chủ" });
  }
};
