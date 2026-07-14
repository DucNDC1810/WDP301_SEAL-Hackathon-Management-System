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

async function createNineTeams() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("✓ Connected to MongoDB");

  // Find the contest '123'
  let contest = await Contest.findOne({ title: "123" });
  if (!contest) {
    contest = await Contest.findById("6a55f1705c9f1c94f848008f");
  }
  if (!contest) {
    console.error("Contest '123' not found in database.");
    process.exit(1);
  }
  console.log(`Using contest: "${contest.title}" (${contest._id})`);

  const passwordHash = await bcrypt.hash("User@123456", 10);

  // Generate 9 teams, each with 4 members
  for (let i = 1; i <= 9; i++) {
    const teamName = `Seal Team ${i}`;
    
    // Leader info
    const leaderSpec = {
      full_name: `Leader ${i}`,
      email: `leader_${i}@seal.com`
    };

    // Members info (3 members)
    const memberSpecs = [
      { full_name: `Member ${i}-1`, email: `member_${i}_1@seal.com` },
      { full_name: `Member ${i}-2`, email: `member_${i}_2@seal.com` },
      { full_name: `Member ${i}-3`, email: `member_${i}_3@seal.com` },
    ];

    // 1. Create or get leader user
    let leader = await User.findOne({ email: leaderSpec.email });
    if (!leader) {
      leader = await User.create({
        full_name: leaderSpec.full_name,
        email: leaderSpec.email,
        password_hash: passwordHash,
        provider: "local",
        is_verified: true,
        is_profile_complete: true,
        roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "contestant" }],
      });
      console.log(`Created leader user: ${leaderSpec.email}`);
    }

    // 2. Build members payload for the team
    const membersPayload = [
      {
        user_id: leader._id,
        email: leader.email,
        full_name: leader.full_name,
        email_verified: true,
        contribution_percentage: 25,
      }
    ];

    for (const m of memberSpecs) {
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
        contribution_percentage: 25,
      });
    }

    // 3. Create or update Team
    const existingTeam = await Team.findOne({ team_name: teamName, contest_id: contest._id });
    if (existingTeam) {
      existingTeam.members = membersPayload;
      existingTeam.leader_id = leader._id;
      existingTeam.status = "CONFIRMED";
      await existingTeam.save();
      console.log(`Updated team "${teamName}" to status CONFIRMED with 4 verified members.`);
    } else {
      const team = await Team.create({
        contest_id: contest._id,
        team_name: teamName,
        leader_id: leader._id,
        members: membersPayload,
        status: "CONFIRMED",
      });
      console.log(`✓ Created team "${team.team_name}" with status CONFIRMED and 4 verified members.`);
    }
  }

  console.log("Seeding 9 teams completed successfully!");
  await mongoose.disconnect();
}

createNineTeams().catch((err) => {
  console.error("Error creating 9 teams:", err);
  mongoose.disconnect();
  process.exit(1);
});
