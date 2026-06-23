/**
 * seed_hackathon_final.js
 *
 * Tạo dữ liệu test đầy đủ cho tính năng:
 *  - Nộp bài Chung kết  (/submission/:round_id/:team_id)
 *  - Phân công Judge    (/round/:round_id/activate)
 *
 * Chạy:
 *   cd web/backend
 *   node --experimental-vm-modules scripts/seed_hackathon_final.js
 *   hoặc (nếu dùng "type":"module" trong package.json):
 *   node scripts/seed_hackathon_final.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import bcrypt from "bcrypt";

import User       from "../src/models/User.js";
import Contest    from "../src/models/Contest.js";
import Team       from "../src/models/Team.js";
import Round      from "../src/models/Round.js";
import Criteria   from "../src/models/Criteria.js";
import JudgeAssignment from "../src/models/JudgeAssignment.js";
import Submission from "../src/models/Submission.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const CONTEST_TITLE = "[SEED] SEAL Hackathon 2026 – Final Test";

// ─── helpers ─────────────────────────────────────────────────────────────────
const days = (n) => new Date(Date.now() + n * 86_400_000);
const log  = (msg) => console.log(`  ✔ ${msg}`);

// ─── main ─────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("\n🔗 Connected to MongoDB\n");

  // ── Cleanup previous seed ──────────────────────────────────────────────────
  const existing = await Contest.findOne({ title: CONTEST_TITLE });
  if (existing) {
    const roundIds = await Round.find({ contest_id: existing._id }).distinct("_id");
    await Promise.all([
      Contest.deleteOne({ _id: existing._id }),
      Round.deleteMany({ contest_id: existing._id }),
      Team.deleteMany({ contest_id: existing._id }),
      Criteria.deleteMany({ round_id: { $in: roundIds } }),
      JudgeAssignment.deleteMany({ contest_id: existing._id }),
      Submission.deleteMany({ round_id: { $in: roundIds } }),
    ]);
    log("Cleared previous seed data");
  }

  // ── 1. Admin user ──────────────────────────────────────────────────────────
  const pwHash = await bcrypt.hash("password123", 10);
  const admin = await User.findOneAndUpdate(
    { email: "admin@seal.com" },
    {
      full_name: "Admin SEAL",
      password_hash: pwHash,
      roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "admin" }],
      is_profile_complete: true,
      is_verified: true,
    },
    { upsert: true, new: true }
  );
  log(`Admin: ${admin.email}  (password: password123)`);

  // ── 2. Contestant / student users (team leaders) ───────────────────────────
  const contestantDefs = [
    { email: "team1.leader@seal.com", full_name: "Nguyễn Văn Alpha" },
    { email: "team2.leader@seal.com", full_name: "Trần Thị Beta" },
    { email: "team3.leader@seal.com", full_name: "Lê Hoàng Gamma" },
    { email: "team4.leader@seal.com", full_name: "Phạm Đức Delta" },
    { email: "team5.leader@seal.com", full_name: "Võ Minh Epsilon" },
  ];

  const contestants = await Promise.all(
    contestantDefs.map((u) =>
      User.findOneAndUpdate(
        { email: u.email },
        {
          full_name: u.full_name,
          password_hash: pwHash,
          roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "contestant" }],
          is_profile_complete: true,
          is_verified: true,
        },
        { upsert: true, new: true }
      )
    )
  );
  log(`Created ${contestants.length} contestant accounts  (password: password123)`);

  // ── 3. Judge users for PRELIMINARY (will be excluded from FINAL pool) ──────
  const prelimJudgeDefs = [
    { email: "judge.prelim1@seal.com", full_name: "Giám khảo Sơ Loại 01 – Trung" },
    { email: "judge.prelim2@seal.com", full_name: "Giám khảo Sơ Loại 02 – Hoa" },
  ];
  const prelimJudges = await Promise.all(
    prelimJudgeDefs.map((u) =>
      User.findOneAndUpdate(
        { email: u.email },
        {
          full_name: u.full_name,
          password_hash: pwHash,
          roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "judge" }],
          is_profile_complete: true,
          is_verified: true,
        },
        { upsert: true, new: true }
      )
    )
  );
  log(`Created ${prelimJudges.length} PRELIMINARY judges`);

  // ── 4. Judge users for FINAL (independent panel) ──────────────────────────
  const finalJudgeDefs = [
    { email: "judge.final1@seal.com", full_name: "Giám khảo Chung Kết 01 – Dr. Minh" },
    { email: "judge.final2@seal.com", full_name: "Giám khảo Chung Kết 02 – Prof. Lan" },
    { email: "judge.final3@seal.com", full_name: "Giám khảo Chung Kết 03 – CEO Khoa" },
  ];
  const finalJudges = await Promise.all(
    finalJudgeDefs.map((u) =>
      User.findOneAndUpdate(
        { email: u.email },
        {
          full_name: u.full_name,
          password_hash: pwHash,
          roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "judge" }],
          is_profile_complete: true,
          is_verified: true,
        },
        { upsert: true, new: true }
      )
    )
  );
  log(`Created ${finalJudges.length} FINAL judges`);

  // ── 5. Contest ─────────────────────────────────────────────────────────────
  const contest = await Contest.create({
    title: CONTEST_TITLE,
    description: "Hackathon test đầy đủ cho tính năng Nộp bài & Phân công Judge Chung kết.",
    status: "open",
    start_date: days(-10),
    end_date: days(30),
    registration_deadline: days(-5),
    created_by: admin._id,
    wildcard_enabled: true,
    rounds: [],           // rounds sẽ lưu ở collection Round riêng
  });
  log(`Contest: "${contest.title}"  ID: ${contest._id}`);

  // ── 6. Round PRELIMINARY (đang active) ────────────────────────────────────
  const prelimRound = await Round.create({
    contest_id: contest._id,
    name: "Vòng Sơ Loại",
    type: "PRELIMINARY",
    is_active: true,
    top_n: 5,
    wildcard_enabled: true,
    wildcard_count: 1,
    round_start: days(-7),
    round_end: days(-1),   // đã kết thúc
  });
  log(`Prelim Round ID: ${prelimRound._id}`);

  // Assign prelim judges vào Sơ Loại
  await Promise.all(
    prelimJudges.map((j) =>
      JudgeAssignment.findOneAndUpdate(
        { judge_id: j._id, round_id: prelimRound._id },
        {
          judge_id: j._id,
          round_id: prelimRound._id,
          contest_id: contest._id,
          assigned_by: admin._id,
        },
        { upsert: true, new: true }
      )
    )
  );
  log(`Assigned ${prelimJudges.length} judges to Prelim Round`);

  // ── 7. Criteria for PRELIMINARY ──────────────────────────────────────────
  await Criteria.insertMany([
    { round_id: prelimRound._id, name: "Kỹ thuật & Code", weight: 0.6, description: "Chất lượng code và giải thuật." },
    { round_id: prelimRound._id, name: "Ý tưởng & Trình bày", weight: 0.4, description: "Tính sáng tạo và khả năng thuyết phục." },
  ]);
  log("Seeded 2 criteria for Prelim Round");

  // ── 8. Round FINAL (chưa active, deadline còn 3 ngày) ────────────────────
  const finalRound = await Round.create({
    contest_id: contest._id,
    name: "Vòng Chung Kết",
    type: "FINAL",
    is_active: false,
    top_n: 5,
    wildcard_enabled: false,
    round_start: days(1),
    round_end: days(3),   // deadline nộp bài = 3 ngày nữa
  });
  log(`Final Round ID: ${finalRound._id}`);

  // ── 9. Criteria for FINAL (total weight = 1.0) ────────────────────────────
  await Criteria.insertMany([
    {
      round_id: finalRound._id,
      name: "Kỹ thuật & Sản phẩm hoàn thiện",
      weight: 0.40,
      description: "Đánh giá chất lượng lập trình, kiến trúc hệ thống và độ hoàn thiện sản phẩm.",
    },
    {
      round_id: finalRound._id,
      name: "Tính sáng tạo & Giá trị thực tiễn",
      weight: 0.30,
      description: "Mức độ đột phá của giải pháp và khả năng triển khai thực tế.",
    },
    {
      round_id: finalRound._id,
      name: "Thuyết trình & Phản biện",
      weight: 0.30,
      description: "Kỹ năng pitch và trả lời câu hỏi từ ban giám khảo.",
    },
  ]);
  log("Seeded 3 criteria for Final Round (total weight = 1.0)");

  // ── 10. Teams (đã vào Chung kết) ─────────────────────────────────────────
  const teamDefs = [
    { name: "Đội Alpha – AI Diagnosis",   leader: contestants[0], is_calibration_sample: true },
    { name: "Đội Beta – GreenChain",      leader: contestants[1] },
    { name: "Đội Gamma – EduBoost",       leader: contestants[2] },
    { name: "Đội Delta – SmartFarm",      leader: contestants[3] },
    { name: "Đội Epsilon – MediTrack",    leader: contestants[4] },
  ];

  const teams = await Promise.all(
    teamDefs.map((t) =>
      Team.create({
        contest_id: contest._id,
        team_name: t.name,
        name: t.name,
        leader_id: t.leader._id,
        status: "CONFIRMED",   // đã xác nhận vào Chung kết
        is_calibration_sample: t.is_calibration_sample || false,
        members: [
          {
            user_id: t.leader._id,
            email: t.leader.email,
            full_name: t.leader.full_name,
            email_verified: true,
            role: "leader",
          },
        ],
      })
    )
  );
  log(`Created ${teams.length} teams (status: CONFIRMED)`);

  // ── 11. Summary ───────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  ✅  SEED HOÀN TẤT");
  console.log("══════════════════════════════════════════════════════\n");

  console.log("📋 THÔNG TIN TÀI KHOẢN (password: password123)");
  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│ Role      │ Email                          │ Mục đích        │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log(`│ admin     │ admin@seal.com                 │ Phân công judge  │`);
  prelimJudgeDefs.forEach((j) =>
    console.log(`│ judge     │ ${j.email.padEnd(30)} │ Sơ Loại (bị loại)│`)
  );
  finalJudgeDefs.forEach((j) =>
    console.log(`│ judge     │ ${j.email.padEnd(30)} │ Chung Kết panel  │`)
  );
  contestantDefs.forEach((u, i) =>
    console.log(`│ contestant│ ${u.email.padEnd(30)} │ Leader team ${i+1}   │`)
  );
  console.log("└─────────────────────────────────────────────────────────────┘\n");

  console.log("🔗 URL TEST (copy/paste vào trình duyệt):\n");
  console.log("1️⃣  Phân công Judge Chung kết (admin):");
  console.log(`   http://localhost:5173/round/${finalRound._id}/activate\n`);

  console.log("2️⃣  Nộp bài Chung kết (dùng từng team leader):");
  teams.forEach((t, i) => {
    console.log(`   Team ${i+1} – ${t.team_name}`);
    console.log(`   http://localhost:5173/submission/${finalRound._id}/${t._id}`);
  });

  console.log("\n3️⃣  Leaderboard Sơ Loại (xem kết quả):");
  console.log(`   http://localhost:5173/leaderboard/${prelimRound._id}\n`);

  console.log("📌 IDs (để dùng với Postman/Thunder Client):");
  console.log(`   contest_id  : ${contest._id}`);
  console.log(`   prelim_round: ${prelimRound._id}`);
  console.log(`   final_round : ${finalRound._id}`);
  teams.forEach((t, i) =>
    console.log(`   team_${i+1}     : ${t._id}  (${t.team_name})`)
  );

  console.log("\n══════════════════════════════════════════════════════\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed thất bại:", err);
  process.exit(1);
});
