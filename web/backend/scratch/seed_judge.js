/**
 * seed_judge.js — Run từ thư mục backend:
 *   node scratch/seed_judge.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const { Types: { ObjectId } } = mongoose;
const S = (v) => v?.toString();

const m = (name, col) =>
  mongoose.models[name] ?? mongoose.model(name, new mongoose.Schema({}, { strict: false }), col);

await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
  dbName: process.env.DB_DATABASE,
});
console.log("✅ Connected:", process.env.DB_DATABASE, "\n");

const User             = m("_User",            "users");
const Contest          = m("_Contest",          "contests");
const Team             = m("_Team",             "teams");
const Pool             = m("_Pool",             "pools");
const JudgeAssignment  = m("_JudgeAssignment",  "judgeassignments");
const PresentationSlot = m("_PresentationSlot", "presentationslots");
const Submission       = m("_Submission",        "submissions");

// ─── 1. Judge ────────────────────────────────────────────────────────────────
const judge = await User.findOne({ email: "judge@gmail.com" }).lean();
if (!judge) {
  console.error("❌ Không tìm thấy judge@gmail.com");
  process.exit(1);
}
console.log(`👤 Judge: ${judge.full_name || judge.email} (${judge._id})`);

// ─── 2. Tìm contest có rounds VÀ nhiều team nhất ─────────────────────────────
const allContests = await Contest.find({}).lean();
const contestsWithRounds = allContests.filter(c => (c.rounds ?? []).length > 0);
const contestIdSet = new Set(contestsWithRounds.map(c => S(c._id)));

const allTeams = await Team.find({ contest_id: { $in: [...contestIdSet].map(id => new mongoose.Types.ObjectId(id)) } }).lean();
const countByContest = {};
for (const t of allTeams) {
  const cid = S(t.contest_id);
  if (cid) countByContest[cid] = (countByContest[cid] ?? 0) + 1;
}

const bestContestId = Object.entries(countByContest).sort((a, b) => b[1] - a[1])[0]?.[0];
if (!bestContestId) {
  console.error("❌ Không có contest nào vừa có rounds vừa có team.");
  console.log("Contests có rounds:", contestsWithRounds.map(c => c._id + " " + c.title));
  process.exit(1);
}

const contest = contestsWithRounds.find(c => S(c._id) === bestContestId);
if (!contest) {
  console.error("❌ Lỗi nội bộ khi tìm contest.");
  process.exit(1);
}
console.log(`🏆 Contest: ${contest.title} (${contest._id}) — ${countByContest[bestContestId]} đội`);

// ─── 3. Round ────────────────────────────────────────────────────────────────
const rounds = contest.rounds ?? [];
if (!rounds.length) {
  console.error("❌ Contest không có round.");
  process.exit(1);
}

// Dùng round đầu tiên, set active + SCORING
let round = rounds.find(r => r.is_active) ?? rounds[0];
await Contest.updateOne(
  { _id: contest._id, "rounds._id": round._id },
  { $set: { "rounds.$.is_active": true, "rounds.$.status": "SCORING", "rounds.$.scoring_locked": false } }
);
// Deactivate các round khác
for (const r of rounds) {
  if (S(r._id) !== S(round._id)) {
    await Contest.updateOne(
      { _id: contest._id, "rounds._id": r._id },
      { $set: { "rounds.$.is_active": false } }
    );
  }
}
console.log(`📋 Round: ${round.name} (${round._id}) → SCORING`);

// Đảm bảo contest status = open
await Contest.updateOne({ _id: contest._id }, { $set: { status: "open" } });

const contestId = contest._id;
const roundId   = round._id;

// ─── 4. Team — CONFIRM tất cả đội thuộc contest này ──────────────────────────
const teams = await Team.find({ contest_id: contestId }).lean();
if (!teams.length) {
  console.error("❌ Contest này không có đội nào.");
  process.exit(1);
}
await Team.updateMany({ contest_id: contestId }, { $set: { status: "CONFIRMED" } });
console.log(`\n👥 ${teams.length} đội → CONFIRMED:`);
teams.forEach(t => console.log(`   • ${t.team_name} (${t._id})`));

// ─── 5. Pool ─────────────────────────────────────────────────────────────────
let pool = await Pool.findOne({ contest_id: contestId, round_id: roundId }).lean();
if (!pool) {
  pool = await Pool.create({
    contest_id: contestId,
    round_id:   roundId,
    pool_name:  "Bảng A",
    teams:      teams.map(t => t._id),
    drive_link: null,
  });
  console.log(`\n🗂  Tạo Pool: ${pool.pool_name} (${pool._id})`);
} else {
  const existing = new Set((pool.teams ?? []).map(S));
  const missing  = teams.filter(t => !existing.has(S(t._id))).map(t => t._id);
  if (missing.length) {
    await Pool.updateOne({ _id: pool._id }, { $addToSet: { teams: { $each: missing } } });
  }
  console.log(`\n🗂  Pool: ${pool.pool_name} (${pool._id})`);
  pool = await Pool.findById(pool._id).lean();
}

// ─── 6. JudgeAssignment ───────────────────────────────────────────────────────
const existing = await JudgeAssignment.findOne({ judge_id: judge._id, contest_id: contestId, round_id: roundId }).lean();
if (existing) {
  await JudgeAssignment.updateOne({ _id: existing._id }, { $set: { pool_id: pool._id, invitation_status: "active" } });
  console.log(`\n📌 JudgeAssignment đã tồn tại → cập nhật pool`);
} else {
  await JudgeAssignment.create({
    contest_id: contestId, round_id: roundId, pool_id: pool._id,
    judge_id: judge._id, judge_type: "INTERNAL",
    invitation_status: "active", assigned_by: judge._id, assigned_at: new Date(),
  });
  console.log(`\n📌 Tạo JudgeAssignment → "${pool.pool_name}"`);
}

// ─── 7. PresentationSlots (đã qua giờ) ───────────────────────────────────────
console.log("\n🗓  PresentationSlots:");
const slotBase = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 giờ trước

for (let i = 0; i < teams.length; i++) {
  const team      = teams[i];
  const startTime = new Date(slotBase.getTime() + i * 30 * 60 * 1000);
  const endTime   = new Date(startTime.getTime() + 25 * 60 * 1000);

  const existingSlot = await PresentationSlot.findOne({ round_id: roundId, booked_team_id: team._id }).lean();
  if (existingSlot) {
    await PresentationSlot.updateOne({ _id: existingSlot._id }, {
      $set: { pool_id: pool._id, start_time: startTime, end_time: endTime, status: "booked" }
    });
    console.log(`   ↺ ${team.team_name}: cập nhật slot`);
  } else {
    await PresentationSlot.create({
      contest_id: contestId, round_id: roundId, pool_id: pool._id,
      start_time: startTime, end_time: endTime,
      room: "Phòng A1", booked_team_id: team._id,
      booked_at: new Date(), status: "booked", note: "",
    });
    console.log(`   + ${team.team_name}: ${startTime.toLocaleTimeString("vi-VN")} – ${endTime.toLocaleTimeString("vi-VN")}`);
  }
}

// ─── 8. Submissions ───────────────────────────────────────────────────────────
console.log("\n📦 Submissions:");
const mockRepos  = ["https://github.com/example/alpha", "https://github.com/example/beta", "https://github.com/example/gamma"];
const mockSlides = ["https://docs.google.com/presentation/d/1abc", "https://docs.google.com/presentation/d/2def", "https://docs.google.com/presentation/d/3ghi"];

for (let i = 0; i < teams.length; i++) {
  const team = teams[i];
  const existingSub = await Submission.findOne({ team_id: team._id, round_id: roundId }).lean();
  if (existingSub) {
    console.log(`   ✓ ${team.team_name}: submission ${existingSub.status}`);
  } else {
    await Submission.create({
      team_id: team._id, contest_id: contestId, round_id: roundId,
      repo_url:   mockRepos[i % mockRepos.length],
      demo_url:   "https://demo.example.com",
      slide_url:  mockSlides[i % mockSlides.length],
      status: "SUBMITTED", is_accessible: true,
      submitted_at: new Date(Date.now() - 3 * 60 * 60 * 1000),
    });
    console.log(`   + ${team.team_name}: tạo submission mock`);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SEED HOÀN TẤT

Judge  : ${judge.email}
Contest: ${contest.title}
Round  : ${round.name} [SCORING]
Pool   : ${pool.pool_name} (${teams.length} đội)

→ Đăng nhập bằng judge@gmail.com
→ Vào /judge/dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

await mongoose.disconnect();
