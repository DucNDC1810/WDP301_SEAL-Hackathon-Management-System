import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Team from "../src/models/Team.js";
import User from "../src/models/User.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB.");

  const contestId = "6a384760a0f8f698410fd360";

  // Delete existing mock teams to start clean if any
  const deleted = await Team.deleteMany({ contest_id: contestId, team_name: /^Đội thi / });
  console.log(`Cleared ${deleted.deletedCount} old mock teams.`);

  // Create or find 10 student users to act as leaders
  const studentUsers = [];
  for (let i = 1; i <= 10; i++) {
    const email = `student.mock${i}@example.com`;
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        full_name: `Sinh viên Mock ${i}`,
        role: "student",
        password: "hashed_dummy_password"
      });
      await user.save();
    }
    studentUsers.push(user);
  }

  // Create 10 confirmed teams
  const teamsToInsert = [];
  for (let i = 1; i <= 10; i++) {
    const leader = studentUsers[i - 1];
    const team = new Team({
      contest_id: contestId,
      team_name: `Đội thi ${i}`,
      leader_id: leader._id,
      status: "CONFIRMED",
      members: [
        {
          email: leader.email,
          full_name: leader.full_name,
          email_verified: true,
        },
        {
          email: `member.a.team${i}@example.com`,
          full_name: `Thành viên A Đội ${i}`,
          email_verified: true,
        },
        {
          email: `member.b.team${i}@example.com`,
          full_name: `Thành viên B Đội ${i}`,
          email_verified: true,
        }
      ]
    });
    await team.save();
    teamsToInsert.push(team);
  }

  console.log(`Successfully created 10 confirmed teams for contest ${contestId}!`);
  
  const count = await Team.countDocuments({ contest_id: contestId, status: "CONFIRMED" });
  console.log(`Total confirmed teams now: ${count}`);

  await mongoose.disconnect();
}

run().catch(console.error);
