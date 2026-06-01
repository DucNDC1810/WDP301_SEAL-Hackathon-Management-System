import express from "express";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import {
  listActiveCompetitions,
  listTeams,
  create,
  join,
  myTeam,
  submitProject,
} from "../controllers/teamController.js";

const router = express.Router();

// GET /api/teams/competitions — danh sách cuộc thi đang mở (cần đăng nhập)
router.get("/competitions", authenticate, listActiveCompetitions);

// GET /api/teams/my-team — đội hiện tại của user (cần đăng nhập)
router.get("/my-team", authenticate, myTeam);

// GET /api/teams?competition_id=xxx — danh sách teams đang mở (cần đăng nhập)
router.get("/", authenticate, listTeams);

// POST /api/teams — tạo đội mới (contestant only)
router.post("/", authenticate, authorize("contestant"), create);

// POST /api/teams/:id/join — tham gia đội (contestant only)
router.post("/:id/join", authenticate, authorize("contestant"), join);

// POST /api/teams/:id/submit — nộp thông tin dự án (contestant only)
router.post("/:id/submit", authenticate, authorize("contestant"), submitProject);

// POST /api/teams/:id/checkin — điểm danh cá nhân (contestant only)
router.post("/:id/checkin", authenticate, authorize("contestant"), async (req, res) => {
  try {
    const TeamMember = (await import('../models/TeamMember.js')).default;
    const membership = await TeamMember.findOne({ user_id: req.user._id, team_id: req.params.id });
    if (!membership) return res.status(403).json({ success: false, message: 'Bạn không thuộc đội này.' });
    
    membership.is_checked_in = true;
    await membership.save();
    res.json({ success: true, message: 'Điểm danh thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

export default router;
