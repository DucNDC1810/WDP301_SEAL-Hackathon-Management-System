import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// ── Inline schemas (standalone script — avoids app-level side-effect imports) ─

const userSchema = new mongoose.Schema(
  {
    full_name:     { type: String, required: true },
    email:         { type: String, required: true, unique: true, lowercase: true },
    password_hash: { type: String, default: null },
    provider:      { type: String, default: "local" },
    is_verified:   { type: Boolean, default: false },
    roles: {
      type: [
        new mongoose.Schema(
          {
            role_id:   { type: mongoose.Schema.Types.ObjectId, required: true },
            role_name: { type: String, required: true, enum: ["admin", "mentor", "contestant"] },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const criteriaSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  max_score:   { type: Number, required: true },
  weight:      { type: Number, default: 1 },
  description: { type: String, default: "" },
});

const roundSchema = new mongoose.Schema({
  round_number:        { type: Number, required: true },
  name:                { type: String, required: true },
  start_time:          { type: Date, default: null },
  end_time:            { type: Date, default: null },
  submission_deadline: { type: Date, default: null },
  score_criteria:      { type: [criteriaSchema], default: [] },
  is_active:           { type: Boolean, default: false },
  scoring_locked:      { type: Boolean, default: false },
});

const contestSchema = new mongoose.Schema(
  {
    title:                 { type: String, required: true },
    description:           { type: String, default: "" },
    start_date:            { type: Date, default: null },
    end_date:              { type: Date, default: null },
    registration_deadline: { type: Date, default: null },
    status:                { type: String, enum: ["draft", "open", "closed"], default: "draft" },
    created_by:            { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rounds:                { type: [roundSchema], default: [] },
    max_teams_per_pool:    { type: Number, default: 10 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const topicSchema = new mongoose.Schema(
  {
    contest_id:  { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    title:       { type: String, required: true },
    description: { type: String, default: "" },
    difficulty:  { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    is_assigned: { type: Boolean, default: false },
    status:      { type: String, enum: ["active", "pending", "approved", "rejected"], default: "active" },
    admin_note:  { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const memberSchema = new mongoose.Schema({
  user_id:       { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  email:         { type: String, required: true, lowercase: true },
  full_name:     { type: String, default: "" },
  email_verified:{ type: Boolean, default: false },
});

const teamSchema = new mongoose.Schema(
  {
    contest_id: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    team_name:  { type: String, required: true },
    leader_id:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members:    { type: [memberSchema], default: [] },
    status:     { type: String, enum: ["pending", "confirmed", "disqualified", "ELIMINATED"], default: "pending" },
    pool_id:    { type: mongoose.Schema.Types.ObjectId, ref: "Pool", default: null },
    topic_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Topic", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const poolSchema = new mongoose.Schema(
  {
    contest_id: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    pool_name:  { type: String, required: true },
    teams:      [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
    topic_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Topic", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const User    = mongoose.models.User    || mongoose.model("User",    userSchema);
const Contest = mongoose.models.Contest || mongoose.model("Contest", contestSchema);
const Topic   = mongoose.models.Topic   || mongoose.model("Topic",   topicSchema);
const Team    = mongoose.models.Team    || mongoose.model("Team",    teamSchema);
const Pool    = mongoose.models.Pool    || mongoose.model("Pool",    poolSchema);

// ── Helpers ──────────────────────────────────────────────────────────────────

const now  = new Date();
const past = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000); // -7 days
const d7   = new Date(now.getTime() + 7  * 24 * 60 * 60 * 1000); // +7 days
const d14  = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // +14 days
const d30  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

async function upsertUser({ full_name, email, password, role_name }) {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`⚠  ${email} already exists — reusing`);
    return existing;
  }
  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    full_name,
    email,
    password_hash,
    provider:    "local",
    is_verified: true,
    roles: [{ role_id: new mongoose.Types.ObjectId(), role_name }],
  });
  console.log(`✓  Created [${role_name}] ${email}`);
  return user;
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB\n");

  // 1. Users
  const mentor  = await upsertUser({ full_name: "Test Mentor",  email: "mentor@test.com",  password: "123456", role_name: "mentor" });
  const leader1 = await upsertUser({ full_name: "Leader One",   email: "leader1@test.com", password: "123456", role_name: "contestant" });
  const leader2 = await upsertUser({ full_name: "Leader Two",   email: "leader2@test.com", password: "123456", role_name: "contestant" });
  console.log("");

  // 2. Contest
  let contest = await Contest.findOne({ title: "SEAL Test Hackathon 2026" });
  if (contest) {
    console.log(`⚠  Contest already exists — reusing (${contest._id})`);
  } else {
    contest = await Contest.create({
      title:                 "SEAL Test Hackathon 2026",
      description:           "Cuộc thi test các feature frontend của dev 4",
      start_date:            past,
      end_date:              d30,
      registration_deadline: d7,
      status:                "open",
      created_by:            mentor._id,
      rounds: [
        {
          round_number:        1,
          name:                "Vòng 1 — Demo Day",
          start_time:          past,
          end_time:            d14,
          submission_deadline: d7,
          is_active:           true,
          scoring_locked:      false,
          score_criteria: [
            { name: "Ý tưởng",  max_score: 10, weight: 1, description: "Tính sáng tạo và khả thi" },
            { name: "Kỹ thuật", max_score: 10, weight: 2, description: "Chất lượng code và kiến trúc" },
            { name: "Trình bày",max_score: 10, weight: 1, description: "Khả năng thuyết trình" },
          ],
        },
      ],
    });
    console.log(`✓  Created contest: ${contest._id}`);
  }

  const roundId = contest.rounds[0]._id;
  console.log(`   Round ID : ${roundId}\n`);

  // 3. Topics
  let topic1 = await Topic.findOne({ contest_id: contest._id, title: "AI Health Assistant" });
  if (!topic1) {
    topic1 = await Topic.create({
      contest_id:  contest._id,
      title:       "AI Health Assistant",
      description: "Ứng dụng AI hỗ trợ tư vấn sức khỏe cá nhân",
      difficulty:  "medium",
      is_assigned: true,
      status:      "approved",
    });
    console.log(`✓  Created topic1: ${topic1._id}`);
  } else {
    console.log(`⚠  topic1 already exists — reusing`);
  }

  let topic2 = await Topic.findOne({ contest_id: contest._id, title: "Smart Campus Platform" });
  if (!topic2) {
    topic2 = await Topic.create({
      contest_id:  contest._id,
      title:       "Smart Campus Platform",
      description: "Nền tảng quản lý campus thông minh cho trường đại học",
      difficulty:  "hard",
      is_assigned: true,
      status:      "approved",
    });
    console.log(`✓  Created topic2: ${topic2._id}`);
  } else {
    console.log(`⚠  topic2 already exists — reusing`);
  }
  console.log("");

  // 4. Teams
  let team1 = await Team.findOne({ contest_id: contest._id, leader_id: leader1._id });
  if (!team1) {
    team1 = await Team.create({
      contest_id: contest._id,
      team_name:  "Team Alpha",
      leader_id:  leader1._id,
      members: [{
        user_id:        leader1._id,
        email:          leader1.email,
        full_name:      leader1.full_name,
        email_verified: true,
      }],
      status:   "confirmed",
      topic_id: topic1._id,
    });
    console.log(`✓  Created team1: ${team1._id}  (leader: ${leader1.email})`);
  } else {
    console.log(`⚠  team1 already exists — reusing`);
  }

  let team2 = await Team.findOne({ contest_id: contest._id, leader_id: leader2._id });
  if (!team2) {
    team2 = await Team.create({
      contest_id: contest._id,
      team_name:  "Team Beta",
      leader_id:  leader2._id,
      members: [{
        user_id:        leader2._id,
        email:          leader2.email,
        full_name:      leader2.full_name,
        email_verified: true,
      }],
      status:   "confirmed",
      topic_id: topic2._id,
    });
    console.log(`✓  Created team2: ${team2._id}  (leader: ${leader2.email})`);
  } else {
    console.log(`⚠  team2 already exists — reusing`);
  }
  console.log("");

  // 5. Pools
  let pool1 = await Pool.findOne({ contest_id: contest._id, pool_name: "Pool A" });
  if (!pool1) {
    pool1 = await Pool.create({
      contest_id: contest._id,
      pool_name:  "Pool A",
      teams:      [team1._id],
      topic_id:   topic1._id,
    });
    console.log(`✓  Created Pool A: ${pool1._id}`);
  } else {
    console.log(`⚠  Pool A already exists — reusing`);
  }

  let pool2 = await Pool.findOne({ contest_id: contest._id, pool_name: "Pool B" });
  if (!pool2) {
    pool2 = await Pool.create({
      contest_id: contest._id,
      pool_name:  "Pool B",
      teams:      [team2._id],
      topic_id:   topic2._id,
    });
    console.log(`✓  Created Pool B: ${pool2._id}`);
  } else {
    console.log(`⚠  Pool B already exists — reusing`);
  }
  console.log("");

  // 6. Back-fill pool_id on teams (safe to repeat)
  await Team.findByIdAndUpdate(team1._id, { pool_id: pool1._id });
  await Team.findByIdAndUpdate(team2._id, { pool_id: pool2._id });
  console.log("✓  pool_id back-filled on both teams");

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  TEST CREDENTIALS");
  console.log("───────────────────────────────────────────────────────────────");
  console.log(`  Mentor   : mentor@test.com  / 123456`);
  console.log(`  Leader 1 : leader1@test.com / 123456   → Team Alpha (Pool A)`);
  console.log(`  Leader 2 : leader2@test.com / 123456   → Team Beta  (Pool B)`);
  console.log("");
  console.log("  TEST URLs  (prefix with http://localhost:5173)");
  console.log("───────────────────────────────────────────────────────────────");
  console.log(`  [Task 1] Nộp bài (login as leader1 or leader2):`);
  console.log(`    /student/submit?contestId=${contest._id}`);
  console.log("");
  console.log(`  [Task 3] Leaderboard (any user):`);
  console.log(`    /leaderboard/${contest._id}/${roundId}`);
  console.log("");
  console.log(`  [Task 4+2] Lịch thuyết trình + Chấm điểm (login as mentor):`);
  console.log(`    /presentation/${contest._id}/${roundId}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("\nSeed error:", err.message);
  process.exit(1);
});
