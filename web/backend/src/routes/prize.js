import { Router } from "express";
import Prize from "../models/Prize.js";
import PrizeClaim from "../models/PrizeClaim.js";
import Team from "../models/Team.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = Router();

// GET /api/prize/:contest_id/claims
// Lấy danh sách claims của các giải thưởng thuộc contest
router.get("/:contest_id/claims", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const prizes = await Prize.find({ contest_id: req.params.contest_id }).lean();
    const prizeIds = prizes.map(p => p._id);
    const claims = await PrizeClaim.find({ prize_id: { $in: prizeIds } })
      .populate("prize_id", "name value")
      .populate("team_id", "team_name")
      .lean();
    return res.json({ success: true, claims });
  } catch (err) { next(err); }
});

// GET /api/prize/:contest_id
// Lấy tất cả prizes của contest kèm thông tin đội được trao
router.get("/:contest_id", async (req, res, next) => {
  try {
    const prizes = await Prize.find({ contest_id: req.params.contest_id })
      .sort({ rank_required: 1 })
      .lean();

    const teamIds = prizes
      .map((p) => p.awarded_team_id)
      .filter(Boolean);

    const teams = teamIds.length
      ? await Team.find({ _id: { $in: teamIds } }, "team_name").lean()
      : [];

    const teamMap = {};
    for (const t of teams) teamMap[t._id.toString()] = t.team_name;

    const result = prizes.map((p) => ({
      prize_id:     p._id,
      name:         p.name,
      description:  p.description,
      value:        p.value,
      rank_required: p.rank_required,
      awarded_team: p.awarded_team_id
        ? { team_id: p.awarded_team_id, team_name: teamMap[p.awarded_team_id.toString()] || "Unknown" }
        : null,
    }));

    return res.json({ success: true, prizes: result });
  } catch (err) { next(err); }
});

// POST /api/prize
// Admin tạo mới giải thưởng
router.post("/", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { contest_id, name, description, value, rank_required, awarded_team_id } = req.body;
    if (!contest_id || !name) {
      return res.status(400).json({ message: "contest_id và name là bắt buộc" });
    }
    const prize = await Prize.create({
      contest_id,
      name,
      description: description || "",
      value: value || "",
      rank_required: rank_required || null,
      awarded_team_id: awarded_team_id || null
    });
    return res.status(201).json({ success: true, prize });
  } catch (err) { next(err); }
});

// PUT /api/prize/:prize_id
// Admin cập nhật giải thưởng
router.put("/:prize_id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, description, value, rank_required, awarded_team_id } = req.body;
    const prize = await Prize.findById(req.params.prize_id);
    if (!prize) {
      return res.status(404).json({ message: "Không tìm thấy giải thưởng" });
    }

    if (name !== undefined) prize.name = name;
    if (description !== undefined) prize.description = description;
    if (value !== undefined) prize.value = value;
    if (rank_required !== undefined) prize.rank_required = rank_required;
    if (awarded_team_id !== undefined) prize.awarded_team_id = awarded_team_id || null;

    await prize.save();
    return res.json({ success: true, prize });
  } catch (err) { next(err); }
});

// DELETE /api/prize/:prize_id
// Admin xóa giải thưởng
router.delete("/:prize_id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const prize = await Prize.findByIdAndDelete(req.params.prize_id);
    if (!prize) {
      return res.status(404).json({ message: "Không tìm thấy giải thưởng" });
    }
    // Xóa claim liên quan nếu có
    await PrizeClaim.deleteMany({ prize_id: req.params.prize_id });
    return res.json({ success: true, message: "Đã xóa giải thưởng thành công" });
  } catch (err) { next(err); }
});

// POST /api/prize/:prize_id/claim
// Đội được trao giải gửi thông tin nhận thưởng
router.post("/:prize_id/claim", async (req, res, next) => {
  try {
    const { prize_id } = req.params;
    const { team_id, contact_name, contact_email, bank_info, note } = req.body;

    if (!team_id) return res.status(400).json({ message: "team_id là bắt buộc" });

    const prize = await Prize.findById(prize_id).lean();
    if (!prize) return res.status(404).json({ message: "Không tìm thấy giải thưởng" });

    if (!prize.awarded_team_id || prize.awarded_team_id.toString() !== team_id.toString()) {
      return res.status(403).json({ message: "Đội của bạn không được trao giải này" });
    }

    const existing = await PrizeClaim.findOne({ prize_id }).lean();
    if (existing) return res.status(409).json({ message: "Đã có thông tin nhận thưởng cho giải này" });

    const claim = await PrizeClaim.create({
      prize_id,
      team_id,
      contact_name:  contact_name  || "",
      contact_email: contact_email || "",
      bank_info:     bank_info     || "",
      note:          note          || "",
    });

    return res.status(201).json({ success: true, claim_id: claim._id });
  } catch (err) { next(err); }
});

// GET /api/prize/:prize_id/claim/:team_id
// Lấy claim hiện tại (nếu có)
router.get("/:prize_id/claim/:team_id", async (req, res, next) => {
  try {
    const { prize_id, team_id } = req.params;

    const prize = await Prize.findById(prize_id).lean();
    if (!prize) return res.status(404).json({ message: "Không tìm thấy giải thưởng" });

    if (!prize.awarded_team_id || prize.awarded_team_id.toString() !== team_id.toString()) {
      return res.status(403).json({ message: "Đội của bạn không được trao giải này" });
    }

    const claim = await PrizeClaim.findOne({ prize_id }).lean();
    return res.json({ success: true, claim: claim || null });
  } catch (err) { next(err); }
});

export default router;
