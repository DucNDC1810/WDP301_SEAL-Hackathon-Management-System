import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// Models inline to avoid ESM import issues with mongoose registering models multiple times
const roleSubSchema = new mongoose.Schema(
  {
    role_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    role_name: { type: String, required: true, enum: ["admin", "mentor", "judge", "contestant"] }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password_hash: { type: String, default: null },
    provider: { type: String, default: "local" },
    is_verified: { type: Boolean, default: true },
    is_profile_complete: { type: Boolean, default: true },
    profile_verify_status: { type: String, enum: ["unsubmitted", "pending", "approved", "rejected"], default: "approved" },
    roles: { type: [roleSubSchema], default: [] }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const teamSchema = new mongoose.Schema(
  {
    team_name: { type: String, required: true },
    contest_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    leader_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    members: { type: Array, default: [] },
    status: { type: String, default: "ACTIVE" },
    pool_id: { type: mongoose.Schema.Types.ObjectId, default: null }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB.");

  const passwordHash = await bcrypt.hash("Test@123456", 10);
  const contestants = [];

  console.log("Creating 40 contestant users...");
  for (let i = 1; i <= 40; i++) {
    const email = `contestant${i}@seal.com`;
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        full_name: `Contestant ${i}`,
        email,
        password_hash: passwordHash,
        provider: "local",
        is_verified: true,
        is_profile_complete: true,
        profile_verify_status: "approved",
        roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "contestant" }]
      });
      console.log(`✓ Created user: ${email}`);
    } else {
      // Ensure existing users are approved and complete
      user.is_verified = true;
      user.is_profile_complete = true;
      user.profile_verify_status = "approved";
      await user.save();
      console.log(`⚠ User ${email} already exists - ensured approved/complete`);
    }
    contestants.push(user);
  }

  console.log("\nCreating 10 eligible teams...");
  for (let t = 0; t < 10; t++) {
    const teamName = `SEAL Team ${t + 1}`;
    
    // Find leader & members for this team
    const leader = contestants[t * 4];
    const memberUsers = contestants.slice(t * 4, t * 4 + 4);
    
    const membersArray = memberUsers.map(u => ({
      user_id: u._id,
      email: u.email,
      full_name: u.full_name,
      email_verified: true,
      verify_token: null,
      verify_token_expires: null
    }));

    // Check if team already exists
    let team = await Team.findOne({ team_name: teamName });
    if (!team) {
      team = await Team.create({
        team_name: teamName,
        contest_id: null,
        leader_id: leader._id,
        status: "ACTIVE",
        members: membersArray
      });
      console.log(`✓ Created team: ${teamName} (Leader: ${leader.email})`);
    } else {
      team.leader_id = leader._id;
      team.status = "ACTIVE";
      team.members = membersArray;
      team.contest_id = null; // Ensure not registered initially
      await team.save();
      console.log(`⚠ Team ${teamName} already exists - reset to ACTIVE eligible state`);
    }
  }

  console.log("\n✅ Successfully seeded 10 eligible teams and 40 contestant users!");
  console.log("Credentials:");
  console.log("- All accounts password: Test@123456");
  console.log("- Team Leaders:");
  for (let t = 0; t < 10; t++) {
    console.log(`  * Team ${t+1} Leader: contestant${t*4 + 1}@seal.com`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
