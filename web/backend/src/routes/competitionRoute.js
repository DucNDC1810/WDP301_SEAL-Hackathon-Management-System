import express from "express";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import {
  getAllCompetitions,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  getCompetitionTeams,
} from "../controllers/competitionController.js";

const router = express.Router();

// Public / Contestant route (must be before admin middleware)
router.get("/:id/public", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const mongoose = (await import('mongoose')).default;
    const Competition = mongoose.models.Competition || mongoose.model('Competition');
    const Team = mongoose.models.Team || mongoose.model('Team');
    const TeamMember = mongoose.models.TeamMember || mongoose.model('TeamMember');
    const User = mongoose.models.User || mongoose.model('User');
    
    const comp = await Competition.findById(id).lean();
    if (!comp) return res.status(404).json({ success: false, message: 'Competition not found' });
    
    const teams = await Team.find({ competition_id: id }).lean();
    for (let team of teams) {
      team.members = await TeamMember.find({ team_id: team._id }).populate('user_id', 'full_name github_username').lean();
    }
    
    // Find mentors for this competition (If mentor model exists)
    // For now, let's just find users with role 'mentor' to simulate
    const mentors = await User.find({ "roles.role_name": "mentor" }).select('full_name avatar_url github_username').limit(5).lean();
    
    res.json({ success: true, data: { competition: comp, teams, mentors } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Tất cả route cuộc thi ở đây đều dành cho Admin quản lý
router.use(authenticate, authorize("admin"));

router.get("/", getAllCompetitions);
router.post("/", createCompetition);
router.get("/:id/teams", getCompetitionTeams);
router.put("/:id", updateCompetition);
router.delete("/:id", deleteCompetition);

export default router;
