import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import User from "../src/models/User.js";
import Contest from "../src/models/Contest.js";
import Team from "../src/models/Team.js";

async function createTeams() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("✓ Connected to MongoDB");

  // Find the latest contest
  const contest = await Contest.findOne().sort({ created_at: -1 });
  if (!contest) {
    console.error("No contest found in the database. Please create a contest first.");
    process.exit(1);
  }
  console.log(`Using latest contest: "${contest.title}" (${contest._id})`);

  const passwordHash = await bcrypt.hash("User@123456", 10);

  const teamSpecs = [
    {
      name: "Cyber Wizards",
      leader: { full_name: "Lê Minh Tuấn", email: "tuan.lm@test.com" },
      members: [
        { full_name: "Nguyễn Thị Hoa", email: "hoa.nt@test.com" },
        { full_name: "Trần Văn Cường", email: "cuong.tv@test.com" }
      ]
    },
    {
      name: "Silicon Dragons",
      leader: { full_name: "Phạm Hồng Sơn", email: "son.ph@test.com" },
      members: [
        { full_name: "Đỗ Thị Linh", email: "linh.dt@test.com" },
        { full_name: "Hoàng Anh Vũ", email: "vu.ha@test.com" }
      ]
    },
    {
      name: "Pixel Knights",
      leader: { full_name: "Bùi Quốc Anh", email: "anh.bq@test.com" },
      members: [
        { full_name: "Phan Hải Yến", email: "yen.ph@test.com" },
        { full_name: "Nguyễn Tiến Đạt", email: "dat.nt@test.com" }
      ]
    }
  ];

  for (const spec of teamSpecs) {
    // 1. Create or get leader user
    let leader = await User.findOne({ email: spec.leader.email });
    if (!leader) {
      leader = await User.create({
        full_name: spec.leader.full_name,
        email: spec.leader.email,
        password_hash: passwordHash,
        provider: "local",
        is_verified: true,
        is_profile_complete: true,
        roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "contestant" }],
      });
      console.log(`Created leader user: ${spec.leader.email}`);
    }

    // 2. Create or get other member users
    const membersPayload = [
      {
        user_id: leader._id,
        email: leader.email,
        full_name: leader.full_name,
        email_verified: true,
        contribution_percentage: 40,
      }
    ];

    for (const m of spec.members) {
      let u = await User.findOne({ email: m.email });
      if (!u) {
        u = await User.create({
          full_name: m.full_name,
          email: m.email,
          password_hash: passwordHash,
          provider: "local",
          is_verified: true,
          is_profile_complete: true,
          roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "contestant" }],
        });
        console.log(`Created member user: ${m.email}`);
      }
      membersPayload.push({
        user_id: u._id,
        email: u.email,
        full_name: u.full_name,
        email_verified: true,
        contribution_percentage: 30,
      });
    }

    // 3. Create Team
    const existingTeam = await Team.findOne({ team_name: spec.name, contest_id: contest._id });
    if (existingTeam) {
      console.log(`Team "${spec.name}" already exists. Skipping.`);
      continue;
    }

    const team = await Team.create({
      contest_id: contest._id,
      team_name: spec.name,
      leader_id: leader._id,
      members: membersPayload,
      status: "CONFIRMED",
    });
    console.log(`✓ Created team "${team.team_name}" with status CONFIRMED.`);
  }

  console.log("Seeding complete!");
  await mongoose.disconnect();
}

createTeams().catch((err) => {
  console.error("Error seeding teams:", err);
  mongoose.disconnect();
  process.exit(1);
});
