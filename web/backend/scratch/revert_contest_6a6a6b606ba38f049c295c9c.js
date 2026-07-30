import dotenv from "dotenv";
import mongoose from "mongoose";

// Load env
dotenv.config({ path: "../.env" });

// Load models
import "../src/models/Contest.js";
import "../src/models/Round.js";
import "../src/models/Team.js";
import "../src/models/User.js";
import "../src/models/Ranking.js";
import "../src/models/Submission.js";

const Contest = mongoose.model("Contest");
const Round = mongoose.model("Round");
const Team = mongoose.model("Team");
const User = mongoose.model("User");
const Ranking = mongoose.model("Ranking");
const Submission = mongoose.model("Submission");

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB database:", process.env.DB_DATABASE);

  const contestId = new mongoose.Types.ObjectId("6a6a6b606ba38f049c295c9c");
  const contest = await Contest.findById(contestId);
  if (contest) {
    const round1 = contest.rounds.find(r => r.round_number === 1);
    const round2 = contest.rounds.find(r => r.round_number === 2);

    if (round1) {
      round1.is_active = true;
      round1.submission_deadline = new Date("2026-07-30T21:16:09.429Z");
      await Round.updateOne({ _id: round1._id }, { $set: { is_active: true, submission_deadline: round1.submission_deadline } });
    }
    if (round2) {
      round2.is_active = false;
      round2.submission_deadline = new Date("2026-08-07T07:00:00.000Z");
      await Round.updateOne({ _id: round2._id }, { $set: { is_active: false, submission_deadline: round2.submission_deadline } });
    }
    await contest.save();
    console.log("Reverted round statuses and deadlines for contest 6a6a6b606ba38f049c295c9c.");
  }

  // Delete created users
  const emailsToDelete = ["saobang@example.com", "phuonghoang@example.com"];
  const users = await User.find({ email: { $in: emailsToDelete } });
  const userIds = users.map(u => u._id);

  // Delete teams
  const teams = await Team.find({ leader_id: { $in: userIds } });
  const teamIds = teams.map(t => t._id);

  await Submission.deleteMany({ team_id: { $in: teamIds } });
  await Ranking.deleteMany({ team_id: { $in: teamIds } });
  await Team.deleteMany({ _id: { $in: teamIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  console.log("Deleted created users, teams, submissions, and ranking entries for Đội Sao Băng and Đội Phượng Hoàng.");

  await mongoose.disconnect();
}

run().catch(console.error);
