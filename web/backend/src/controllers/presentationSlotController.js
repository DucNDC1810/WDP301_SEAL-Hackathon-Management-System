import mongoose from "mongoose";
import PresentationSlot from "../models/PresentationSlot.js";
import Contest from "../models/Contest.js";
import Team from "../models/Team.js";
import Pool from "../models/Pool.js";
import Submission from "../models/Submission.js";
import Ranking from "../models/Ranking.js";

// ─── Helper ───────────────────────────────────────────────────────────────────

const isFinalRound = async (contestId, roundId) => {
  if (!contestId || !roundId) return false;
  const contest = await Contest.findById(contestId).select("rounds");
  const round = contest?.rounds?.find((r) => r._id.toString() === roundId.toString());
  if (!round || !contest.rounds.length) return false;
  // Vòng cuối cùng (round_number lớn nhất) mới là FINAL — không phải "bất kỳ vòng nào sau vòng 1",
  // để hỗ trợ đúng cuộc thi có nhiều hơn 2 vòng (sơ loại nhiều cấp).
  const maxRoundNumber = Math.max(...contest.rounds.map((r) => r.round_number));
  return round.round_number === maxRoundNumber;
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const handleCreateSlot = async (req, res) => {
  try {
    const { contest_id, round_id, pool_id, start_time, end_time, room, note } = req.body;
    const isFinal = await isFinalRound(contest_id, round_id);
    const slot = await PresentationSlot.create({
      contest_id, round_id,
      pool_id: isFinal ? null : pool_id,
      start_time, end_time,
      room: room || "",
      note: note || "",
    });
    res.status(201).json(slot);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleBulkCreateSlots = async (req, res) => {
  try {
    const {
      contest_id, round_id,
      pool_id,                      // ignored when all_pools = true
      all_pools = false,
      start_time,
      slot_duration_min = 20,
      break_duration_min = 5,
      rooms = [],                   // array of room names
      count = 1,
      note = "",
    } = req.body;

    const isFinal = await isFinalRound(contest_id, round_id);

    const slotDur  = Math.max(1, slot_duration_min)  * 60 * 1000;
    const breakDur = Math.max(0, break_duration_min) * 60 * 1000;
    const step     = slotDur + breakDur;
    const n        = Math.min(count, 100);
    const roomList = Array.isArray(rooms) && rooms.length ? rooms : [""];

    // Resolve pool list
    let poolIds = [];
    if (isFinal) {
      poolIds = [null];
    } else if (all_pools) {
      const allPools = await Pool.find({ contest_id }, "_id").lean();
      poolIds = allPools.map((p) => p._id.toString());
    } else {
      if (!pool_id) return res.status(400).json({ message: "Thiếu pool_id" });
      poolIds = [pool_id];
    }

    const docs = [];
    const base = new Date(start_time).getTime();

    for (const pid of poolIds) {
      for (const room of roomList) {
        for (let i = 0; i < n; i++) {
          const slotStart = base + i * step;
          docs.push({
            contest_id,
            round_id,
            pool_id: pid,
            start_time: new Date(slotStart),
            end_time:   new Date(slotStart + slotDur),
            room: room.trim(),
            note,
          });
        }
      }
    }

    const created = await PresentationSlot.insertMany(docs);
    res.status(201).json({ count: created.length, slots: created });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleGetSlots = async (req, res) => {
  try {
    const { contest_id, round_id, pool_id } = req.query;
    const filter = {};
    if (contest_id) filter.contest_id = contest_id;
    if (round_id)   filter.round_id   = round_id;

    const isFinal = round_id ? await isFinalRound(contest_id, round_id) : false;
    if (!isFinal && pool_id) {
      filter.pool_id = pool_id;
    }

    const slots = await PresentationSlot.find(filter)
      .populate("booked_team_id", "team_name")
      .populate("pool_id", "pool_name")
      .sort({ start_time: 1 });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const handleUpdateSlot = async (req, res) => {
  try {
    const slot = await PresentationSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: "Slot không tồn tại" });
    if (slot.booked_team_id) return res.status(400).json({ message: "Slot đã có đội đăng ký, không thể sửa" });
    const { start_time, end_time, room, note } = req.body;
    if (start_time) slot.start_time = start_time;
    if (end_time)   slot.end_time   = end_time;
    if (room   !== undefined) slot.room = room;
    if (note   !== undefined) slot.note = note;
    await slot.save();
    res.json(slot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Random gán các đội finalist đã CONFIRMED vào các slot available của round chung kết.
// Gọi lại nhiều lần sẽ reset toàn bộ slot đã book (của round này) về available rồi gán lại từ đầu.
export const handleRandomAssignSlots = async (req, res) => {
  try {
    const { contest_id, round_id } = req.body;
    if (!contest_id || !round_id)
      return res.status(400).json({ message: "Thiếu contest_id hoặc round_id" });

    const contest = await Contest.findById(contest_id).select("rounds");
    if (!contest) return res.status(404).json({ message: "Không tìm thấy cuộc thi" });

    const sortedRounds = [...(contest.rounds || [])].sort((a, b) => a.round_number - b.round_number);
    const currentRoundIndex = sortedRounds.findIndex((r) => r._id.toString() === round_id.toString());
    if (currentRoundIndex < 0) return res.status(404).json({ message: "Không tìm thấy vòng thi" });

    let teamIds;
    if (currentRoundIndex === 0) {
      const teams = await Team.find({ contest_id, status: "CONFIRMED" }, "_id").lean();
      teamIds = teams.map((t) => t._id);
    } else {
      const prevRound = sortedRounds[currentRoundIndex - 1];
      const qualifiedRankings = await Ranking.find({
        contest_id,
        round_id: prevRound._id,
        qualified: true,
      }, "team_id").lean();
      const qualifiedTeamIds = qualifiedRankings.map((r) => r.team_id);
      const teams = await Team.find({
        _id: { $in: qualifiedTeamIds },
        status: "CONFIRMED",
      }, "_id").lean();
      teamIds = teams.map((t) => t._id);
    }

    if (teamIds.length === 0)
      return res.status(400).json({ message: "Không có đội nào đủ điều kiện để xếp lịch" });

    const slots = await PresentationSlot.find({
      contest_id,
      round_id,
      status: { $ne: "cancelled" },
    }).sort({ start_time: 1 });

    if (slots.length < teamIds.length)
      return res.status(400).json({
        message: `Không đủ slot cho tất cả các đội (${teamIds.length} đội, ${slots.length} slot). Vui lòng tạo thêm slot.`,
      });

    // Fisher-Yates shuffle
    const shuffled = [...teamIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const now = new Date();
    const bulkOps = slots.map((slot, idx) => {
      const teamId = idx < shuffled.length ? shuffled[idx] : null;
      return {
        updateOne: {
          filter: { _id: slot._id },
          update: teamId
            ? { $set: { booked_team_id: teamId, booked_at: now, status: "booked" } }
            : { $set: { booked_team_id: null, booked_at: null, status: "available" } },
        },
      };
    });
    await PresentationSlot.bulkWrite(bulkOps);

    const result = await PresentationSlot.find({ contest_id, round_id })
      .populate("booked_team_id", "team_name")
      .sort({ start_time: 1 });

    res.json({ message: "Đã random xếp lịch thuyết trình", assigned: shuffled.length, slots: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleCancelSlot = async (req, res) => {
  try {
    const slot = await PresentationSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: "Slot không tồn tại" });
    slot.booked_team_id = null;
    slot.booked_at      = null;
    slot.status         = "cancelled";
    await slot.save();
    res.json(slot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Student ─────────────────────────────────────────────────────────────────

const findStudentTeam = async (userId, contestId) =>
  Team.findOne({
    contest_id: contestId,
    "members.user_id": userId,
    status: { $nin: ["rejected", "cancelled"] },
  });

const findRoundInContest = async (contestId, roundId) => {
  const contest = await Contest.findById(contestId).select("rounds");
  return contest?.rounds?.find((r) => r._id.toString() === roundId) ?? null;
};

export const handleGetMyPoolSlots = async (req, res) => {
  try {
    const { contest_id, round_id } = req.query;
    if (!contest_id || !round_id)
      return res.status(400).json({ message: "Thiếu contest_id hoặc round_id" });

    const team = await findStudentTeam(req.user._id, contest_id);
    if (!team) return res.status(404).json({ message: "Không tìm thấy đội thi" });

    const round = await findRoundInContest(contest_id, round_id);
    if (!round) return res.status(404).json({ message: "Không tìm thấy vòng thi" });

    // Nếu vòng thi hiện tại không phải vòng đầu tiên, kiểm tra xem đội có lọt vào vòng này không (qualified ở vòng trước)
    const contest = await Contest.findById(contest_id).select("rounds");
    const sortedRounds = [...(contest?.rounds || [])].sort((a, b) => a.round_number - b.round_number);
    const currentRoundIndex = sortedRounds.findIndex((r) => r._id.toString() === round_id.toString());
    if (currentRoundIndex > 0) {
      const prevRound = sortedRounds[currentRoundIndex - 1];
      const Ranking = (await import("mongoose")).default.model("Ranking");
      const isQualified = await Ranking.exists({
        contest_id: contest._id,
        round_id: prevRound._id,
        team_id: team._id,
        qualified: true,
      });
      if (!isQualified) {
        return res.status(403).json({ message: "Đội thi của bạn không lọt vào vòng tiếp theo" });
      }
    }

    if (round.submission_deadline && new Date() > new Date(round.submission_deadline)) {
      return res.status(400).json({
        message: "Đã qua hạn nộp bài. Không thể đăng ký lịch trình bày nữa.",
        submission_deadline: round.submission_deadline,
      });
    }

    const submission = await Submission.findOne({ team_id: team._id, round_id });
    if (!submission) {
      return res.status(403).json({ message: "Đội chưa nộp bài. Vui lòng nộp bài trước khi đăng ký lịch trình bày." });
    }

    const isFinal = round.round_number > 1;

    const query = {
      contest_id,
      round_id,
      status: "available",
    };
    if (!isFinal) {
      query.pool_id = team.pool_id;
    }

    const [slots, myBooking] = await Promise.all([
      PresentationSlot.find(query).sort({ start_time: 1 }),
      PresentationSlot.findOne({ round_id, booked_team_id: team._id }),
    ]);

    res.json({ slots, myBooking: myBooking || null, teamId: team._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const handleGetMyBooking = async (req, res) => {
  try {
    const { contest_id, round_id } = req.query;
    if (!contest_id || !round_id)
      return res.status(400).json({ message: "Thiếu tham số" });

    const team = await findStudentTeam(req.user._id, contest_id);
    if (!team) return res.status(404).json({ message: "Không tìm thấy đội thi" });

    const booking = await PresentationSlot.findOne({ round_id, booked_team_id: team._id });
    res.json({ booking: booking || null, teamId: team._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const handleBookSlot = async (req, res) => {
  try {
    const slot = await PresentationSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: "Slot không tồn tại" });
    if (slot.status !== "available" || slot.booked_team_id)
      return res.status(400).json({ message: "Slot không còn trống" });

    const round = await findRoundInContest(slot.contest_id.toString(), slot.round_id.toString());
    const isFinal = round && round.round_number > 1;

    const team = await findStudentTeam(req.user._id, slot.contest_id.toString());
    if (!team) return res.status(404).json({ message: "Không tìm thấy đội thi" });
    if (!isFinal && team.pool_id?.toString() !== slot.pool_id?.toString())
      return res.status(403).json({ message: "Slot này không thuộc pool của đội bạn" });

    // Nếu vòng thi hiện tại không phải vòng đầu tiên, kiểm tra xem đội có lọt vào vòng này không (qualified ở vòng trước)
    const contest = await Contest.findById(slot.contest_id).select("rounds");
    const sortedRounds = [...(contest?.rounds || [])].sort((a, b) => a.round_number - b.round_number);
    const currentRoundIndex = sortedRounds.findIndex((r) => r._id.toString() === slot.round_id.toString());
    if (currentRoundIndex > 0) {
      const prevRound = sortedRounds[currentRoundIndex - 1];
      const Ranking = (await import("mongoose")).default.model("Ranking");
      const isQualified = await Ranking.exists({
        contest_id: contest._id,
        round_id: prevRound._id,
        team_id: team._id,
        qualified: true,
      });
      if (!isQualified) {
        return res.status(403).json({ message: "Đội thi của bạn không lọt vào vòng tiếp theo" });
      }
    }

    if (round?.submission_deadline && new Date() > new Date(round.submission_deadline))
      return res.status(400).json({ message: "Đã qua hạn nộp bài, không thể đăng ký lịch trình bày nữa." });

    const submission = await Submission.findOne({ team_id: team._id, round_id: slot.round_id });
    if (!submission)
      return res.status(403).json({ message: "Đội chưa nộp bài. Vui lòng nộp bài trước khi đăng ký lịch." });

    const existing = await PresentationSlot.findOne({
      round_id: slot.round_id,
      booked_team_id: team._id,
    });
    if (existing)
      return res.status(400).json({ message: "Đội đã có lịch trình bày cho vòng này" });

    // Atomic conditional update: chỉ thắng nếu slot vẫn còn "available" tại thời điểm ghi.
    // Tránh race condition khi 2 đội cùng book 1 slot gần như đồng thời.
    const updated = await PresentationSlot.findOneAndUpdate(
      { _id: slot._id, status: "available", booked_team_id: null },
      { $set: { booked_team_id: team._id, booked_at: new Date(), status: "booked" } },
      { new: true }
    );
    if (!updated)
      return res.status(409).json({ message: "Slot vừa được đội khác đặt trước, vui lòng chọn slot khác" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const handleCancelMyBooking = async (req, res) => {
  try {
    const slot = await PresentationSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: "Slot không tồn tại" });

    const team = await findStudentTeam(req.user._id, slot.contest_id.toString());
    if (!team) return res.status(404).json({ message: "Không tìm thấy đội thi" });
    if (slot.booked_team_id?.toString() !== team._id.toString())
      return res.status(403).json({ message: "Đây không phải lịch của đội bạn" });

    const round = await findRoundInContest(slot.contest_id.toString(), slot.round_id.toString());
    if (round?.submission_deadline && new Date() > new Date(round.submission_deadline))
      return res.status(400).json({ message: "Đã qua hạn nộp bài, không thể hủy lịch trình bày." });

    slot.booked_team_id = null;
    slot.booked_at      = null;
    slot.status         = "available";
    await slot.save();
    res.json({ message: "Hủy lịch thành công", slot });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
