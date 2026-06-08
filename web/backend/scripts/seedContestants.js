/**
 * Seed contestant accounts + gán làm leader/member của các team trong contest TEST
 * Contest ID: 6a242f1283e7cf1b676a9808
 *
 * Chạy: node scripts/seedContestants.js
 */
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// ── Inline schemas ─────────────────────────────────────────────────────────

const roleSubSchema = new mongoose.Schema(
  { role_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    role_name: { type: String, required: true, enum: ["admin","mentor","judge","contestant"] } },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  { full_name: { type: String, required: true },
    email:     { type: String, required: true, unique: true, lowercase: true },
    password_hash: { type: String, default: null },
    provider:  { type: String, default: "local" },
    is_verified: { type: Boolean, default: true },
    roles:     { type: [roleSubSchema], default: [] } },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const teamSchema = new mongoose.Schema(
  { team_name:  String,
    contest_id: mongoose.Schema.Types.ObjectId,
    leader_id:  mongoose.Schema.Types.ObjectId,
    members:    { type: Array, default: [] },
    status:     { type: String, default: "confirmed" },
    pool_id:    mongoose.Schema.Types.ObjectId },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);

// ── Accounts cần tạo ────────────────────────────────────────────────────────

const CONTESTANTS = [
  { full_name: "Nguyen Van An",      email: "an.nguyen@student.fpt.edu.vn",   password: "Test@123456" },
  { full_name: "Tran Thi Bich",      email: "bich.tran@student.fpt.edu.vn",   password: "Test@123456" },
  { full_name: "Le Hoang Cuong",     email: "cuong.le@student.fpt.edu.vn",    password: "Test@123456" },
  { full_name: "Pham Ngoc Dung",     email: "dung.pham@student.fpt.edu.vn",   password: "Test@123456" },
  { full_name: "Hoang Minh Duc",     email: "duc.hoang@student.fpt.edu.vn",   password: "Test@123456" },
  { full_name: "Vu Thi Lan",         email: "lan.vu@student.fpt.edu.vn",      password: "Test@123456" },
  { full_name: "Do Quang Minh",      email: "minh.do@student.fpt.edu.vn",     password: "Test@123456" },
  { full_name: "Nguyen Thi Ngoc",    email: "ngoc.nguyen@student.fpt.edu.vn", password: "Test@123456" },
  { full_name: "Bui Van Phong",      email: "phong.bui@student.fpt.edu.vn",   password: "Test@123456" },
  { full_name: "Dang Thi Quynh",     email: "quynh.dang@student.fpt.edu.vn",  password: "Test@123456" },
  { full_name: "Cao Xuan Son",       email: "son.cao@student.fpt.edu.vn",     password: "Test@123456" },
  { full_name: "Ngo Thi Thu",        email: "thu.ngo@student.fpt.edu.vn",     password: "Test@123456" },
];

// ── 12 teams trong contest, mỗi team 1 leader ──────────────────────────────
const CONTEST_ID = "6a242f1283e7cf1b676a9808";

async function seed() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("✓ Connected to MongoDB\n");

  // Tạo user accounts
  const createdUsers = [];
  for (const acc of CONTESTANTS) {
    let user = await User.findOne({ email: acc.email });
    if (user) {
      console.log(`⚠  ${acc.email} đã tồn tại — skipped`);
      createdUsers.push(user);
      continue;
    }
    const password_hash = await bcrypt.hash(acc.password, 10);
    user = await User.create({
      full_name:    acc.full_name,
      email:        acc.email,
      password_hash,
      provider:     "local",
      is_verified:  true,
      roles:        [{ role_id: new mongoose.Types.ObjectId(), role_name: "contestant" }],
    });
    createdUsers.push(user);
    console.log(`✓ Created [contestant] ${acc.full_name} — ${acc.email}`);
  }

  // Gán mỗi user làm leader của 1 team trong contest
  const teams = await Team.find({ contest_id: new mongoose.Types.ObjectId(CONTEST_ID) })
    .sort("team_name")
    .lean();

  if (teams.length === 0) {
    console.log("\n⚠  Chưa có team trong contest. Chạy seedTestPools.js trước.");
    await mongoose.disconnect();
    return;
  }

  console.log(`\n── Gán ${createdUsers.length} user vào ${teams.length} team ──`);

  for (let i = 0; i < Math.min(createdUsers.length, teams.length); i++) {
    const user = createdUsers[i];
    const team = teams[i];

    await Team.updateOne(
      { _id: team._id },
      {
        $set: {
          leader_id: user._id,
          members: [
            { user_id: user._id, full_name: user.full_name, email: user.email, email_verified: true },
          ],
        },
      }
    );
    console.log(`✓ ${team.team_name.padEnd(16)} → leader: ${user.full_name} (${user.email})`);
  }

  console.log("\n✅ Hoàn thành!");
  console.log("──────────────────────────────────────────");
  console.log("Tài khoản mẫu (tất cả dùng password: Test@123456):");
  CONTESTANTS.slice(0, 3).forEach(a => console.log(`   ${a.email}`));
  console.log("   ...");

  await mongoose.disconnect();
}

seed().catch(e => { console.error("✗ Error:", e.message); process.exit(1); });
