import { Router } from "express";
import jwt from "jsonwebtoken";
import Contest from "../models/Contest.js";
import IndividualScore from "../models/IndividualScore.js";
import Chapter from "../models/Chapter.js";
import User from "../models/User.js";
import Team from "../models/Team.js";

const router = Router();

const requireAdmin = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
    const payload = jwt.verify(header.split(" ")[1], process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.id).select("roles").lean();
    if (!user?.roles?.some((r) => r.role_name === "admin")) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.adminUser = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ── GET /api/admin/ranking/contests
// Trả tất cả contests kèm individual_ranking_enabled
router.get("/contests", requireAdmin, async (req, res, next) => {
  try {
    const contests = await Contest.find(
      {},
      "title status individual_ranking_enabled rounds start_date end_date"
    ).sort({ created_at: -1 }).lean();
    return res.json({ success: true, data: contests });
  } catch (err) { next(err); }
});

// ── PATCH /api/admin/ranking/contests/:id/individual-toggle
// Bật/tắt individual_ranking_enabled
router.patch("/contests/:id/individual-toggle", requireAdmin, async (req, res, next) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ message: "Contest not found" });
    contest.individual_ranking_enabled = !contest.individual_ranking_enabled;
    await contest.save();
    return res.json({ success: true, individual_ranking_enabled: contest.individual_ranking_enabled });
  } catch (err) { next(err); }
});

// ── GET /api/admin/ranking/contests/:id/individuals
// Lấy danh sách IndividualScore của contest, kèm user info
router.get("/contests/:id/individuals", requireAdmin, async (req, res, next) => {
  try {
    const contestId = req.params.id;

    // Lấy tất cả users có team trong contest này
    const teams = await Team.find({ contest_id: contestId })
      .populate("leader_id", "full_name email")
      .populate("members.user_id", "full_name email")
      .lean();

    const userMap = {};
    for (const team of teams) {
      const addUser = (u) => {
        if (u?._id) userMap[u._id.toString()] = { _id: u._id, full_name: u.full_name, email: u.email };
      };
      addUser(team.leader_id);
      (team.members || []).forEach((m) => addUser(m.user_id));
    }

    // Lấy IndividualScore records
    const scores = await IndividualScore.find({ contest_id: contestId }).lean();
    const scoreMap = {};
    for (const s of scores) scoreMap[s.user_id.toString()] = s;

    // Merge: tất cả users trong contest, điền score nếu có
    const result = Object.values(userMap).map((u) => {
      const s = scoreMap[u._id.toString()];
      return {
        user_id: u._id,
        full_name: u.full_name || u.email,
        email: u.email,
        score_this_hackathon: s?.score_this_hackathon ?? 0,
        cumulative_score: s?.cumulative_score ?? 0,
        season_breakdown: s?.season_breakdown ?? [],
        has_record: !!s,
      };
    });

    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/ranking/contests/:id/individuals/:userId
// Upsert IndividualScore cho 1 user
router.put("/contests/:id/individuals/:userId", requireAdmin, async (req, res, next) => {
  try {
    const { id: contest_id, userId: user_id } = req.params;
    const { score_this_hackathon, cumulative_score, season_breakdown } = req.body;

    const updated = await IndividualScore.findOneAndUpdate(
      { contest_id, user_id },
      {
        $set: {
          score_this_hackathon: Number(score_this_hackathon) || 0,
          cumulative_score: Number(cumulative_score) || 0,
          ...(season_breakdown !== undefined && { season_breakdown }),
        },
      },
      { upsert: true, new: true }
    );
    return res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ── GET /api/admin/ranking/chapters
// Lấy tất cả Chapter documents
router.get("/chapters", requireAdmin, async (req, res, next) => {
  try {
    const chapters = await Chapter.find().sort({ name: 1 }).lean();
    return res.json({ success: true, data: chapters });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/ranking/chapters/:id
// Sửa cumulative_score + season_scores của chapter
router.put("/chapters/:id", requireAdmin, async (req, res, next) => {
  try {
    const { cumulative_score, season_scores } = req.body;
    const updated = await Chapter.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          cumulative_score: Number(cumulative_score) || 0,
          ...(season_scores !== undefined && { season_scores }),
        },
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Chapter not found" });
    return res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ── POST /api/admin/ranking/chapters
// Tạo chapter mới
router.post("/chapters", requireAdmin, async (req, res, next) => {
  try {
    const { name, cumulative_score } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "name là bắt buộc" });
    const chapter = await Chapter.create({
      name: name.trim(),
      cumulative_score: Number(cumulative_score) || 0,
    });
    return res.status(201).json({ success: true, data: chapter });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Chapter đã tồn tại" });
    next(err);
  }
});

export default router;
