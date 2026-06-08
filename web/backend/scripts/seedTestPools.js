import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// ── Models inline (tránh circular import) ──────────────────────────────────

const teamSchema = new mongoose.Schema(
  {
    team_name:  { type: String, required: true, trim: true },
    contest_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Contest" },
    leader_id:  { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    members:    { type: Array, default: [] },
    status:     { type: String, enum: ["pending","confirmed","disqualified","ELIMINATED"], default: "pending" },
    pool_id:    { type: mongoose.Schema.Types.ObjectId, ref: "Pool", default: null },
    is_eliminated: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const poolSchema = new mongoose.Schema(
  {
    pool_name:  { type: String, required: true, trim: true },
    contest_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Contest" },
    teams:      [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const userSchema = new mongoose.Schema({ email: String, roles: Array });

const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);
const Pool = mongoose.models.Pool || mongoose.model("Pool", poolSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);

// ── Config ──────────────────────────────────────────────────────────────────

const CONTEST_ID = "6a242f1283e7cf1b676a9808";

const TEAM_NAMES = [
  "Team Alpha",   "Team Beta",    "Team Gamma",
  "Team Delta",   "Team Epsilon", "Team Zeta",
  "Team Eta",     "Team Theta",   "Team Iota",
  "Team Kappa",   "Team Lambda",  "Team Mu",
];

const POOL_NAMES = ["Bảng A", "Bảng B", "Bảng C"];

// ── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("✓ Connected to MongoDB\n");

  // Tìm admin user để dùng làm leader
  const admin = await User.findOne({ "roles.role_name": "admin" }).select("_id email");
  if (!admin) {
    console.error("✗ Không tìm thấy admin user. Chạy seedUsers.js trước.");
    process.exit(1);
  }
  console.log(`✓ Leader ID: ${admin._id} (${admin.email})\n`);

  const contestId = new mongoose.Types.ObjectId(CONTEST_ID);

  // Xóa data cũ của contest này (idempotent)
  const oldTeamIds = await Team.find({ contest_id: contestId }).distinct("_id");
  if (oldTeamIds.length > 0) {
    await Team.deleteMany({ contest_id: contestId });
    await Pool.deleteMany({ contest_id: contestId });
    console.log(`✗ Đã xóa ${oldTeamIds.length} team và pools cũ\n`);
  }

  // Tạo teams
  const teams = await Team.insertMany(
    TEAM_NAMES.map(name => ({
      team_name:  name,
      contest_id: contestId,
      leader_id:  admin._id,
      status:     "confirmed",
      members:    [{ user_id: admin._id, full_name: "Admin", email: admin.email, email_verified: true }],
    }))
  );
  console.log(`✓ Đã tạo ${teams.length} đội:\n${teams.map(t => `   - ${t.team_name}`).join("\n")}\n`);

  // Chia đều vào pools
  const pools = [];
  for (let i = 0; i < POOL_NAMES.length; i++) {
    const poolTeams = teams.filter((_, idx) => idx % POOL_NAMES.length === i);
    const pool = await Pool.create({
      pool_name:  POOL_NAMES[i],
      contest_id: contestId,
      teams:      poolTeams.map(t => t._id),
    });

    // Gắn pool_id ngược vào team
    await Team.updateMany(
      { _id: { $in: poolTeams.map(t => t._id) } },
      { $set: { pool_id: pool._id } }
    );

    pools.push(pool);
    console.log(`✓ ${pool.pool_name}: ${poolTeams.map(t => t.team_name).join(", ")}`);
  }

  console.log(`\n✅ Hoàn thành! ${pools.length} bảng đấu, ${teams.length} đội.`);
  console.log(`   Contest: ${CONTEST_ID}`);
  await mongoose.disconnect();
}

seed().catch(e => { console.error("✗ Error:", e.message); process.exit(1); });
