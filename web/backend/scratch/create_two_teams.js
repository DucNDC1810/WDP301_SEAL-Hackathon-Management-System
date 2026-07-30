import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";
import Team from "../src/models/Team.js";
import Contest from "../src/models/Contest.js";

dotenv.config({ path: ".env" });

async function run() {
  const uri = process.env.MONGODB_CONNECTION_STRING;
  const dbName = process.env.DB_DATABASE;
  await mongoose.connect(uri, { dbName });
  console.log("Connected to DB.");

  // 1. Find the contests named "1"
  const contests = await Contest.find({ title: "1" });
  if (contests.length === 0) {
    console.error("No contest found with title '1'!");
    await mongoose.disconnect();
    return;
  }
  console.log(`Found ${contests.length} contest(s) with title '1'.`);

  // 2. Create or find two dummy contestant users
  const pwdHash = await bcrypt.hash("123456", 10);
  
  let userA = await User.findOne({ email: "doia@seal.com" });
  if (!userA) {
    userA = new User({
      full_name: "Nguyễn Văn Đội A",
      email: "doia@seal.com",
      password_hash: pwdHash,
      is_verified: true,
      is_profile_complete: true,
      roles: [{
        role_id: new mongoose.Types.ObjectId(),
        role_name: "contestant"
      }]
    });
    await userA.save();
    console.log("Created user A: doia@seal.com");
  } else {
    console.log("User A already exists.");
  }

  let userB = await User.findOne({ email: "doib@seal.com" });
  if (!userB) {
    userB = new User({
      full_name: "Trần Thị Đội B",
      email: "doib@seal.com",
      password_hash: pwdHash,
      is_verified: true,
      is_profile_complete: true,
      roles: [{
        role_id: new mongoose.Types.ObjectId(),
        role_name: "contestant"
      }]
    });
    await userB.save();
    console.log("Created user B: doib@seal.com");
  } else {
    console.log("User B already exists.");
  }

  // 3. For each contest, create 2 teams
  for (const contest of contests) {
    console.log(`Processing contest ID: ${contest._id} ("${contest.title}")`);

    // Team A
    let teamA = await Team.findOne({ contest_id: contest._id, team_name: "Đội Sấm Sét" });
    if (!teamA) {
      teamA = new Team({
        contest_id: contest._id,
        team_name: "Đội Sấm Sét",
        leader_id: userA._id,
        status: "CONFIRMED",
        members: [{
          user_id: userA._id,
          email: userA.email,
          full_name: userA.full_name,
          email_verified: true,
          role: "leader"
        }]
      });
      await teamA.save();
      console.log(`  Created Team "Đội Sấm Sét" for contest ${contest._id}`);
    } else {
      console.log(`  Team "Đội Sấm Sét" already exists for contest ${contest._id}`);
    }

    // Team B
    let teamB = await Team.findOne({ contest_id: contest._id, team_name: "Đội Bão Tố" });
    if (!teamB) {
      teamB = new Team({
        contest_id: contest._id,
        team_name: "Đội Bão Tố",
        leader_id: userB._id,
        status: "CONFIRMED",
        members: [{
          user_id: userB._id,
          email: userB.email,
          full_name: userB.full_name,
          email_verified: true,
          role: "leader"
        }]
      });
      await teamB.save();
      console.log(`  Created Team "Đội Bão Tố" for contest ${contest._id}`);
    } else {
      console.log(`  Team "Đội Bão Tố" already exists for contest ${contest._id}`);
    }
  }

  await mongoose.disconnect();
  console.log("Disconnected from DB. Done.");
}

run().catch(console.error);
