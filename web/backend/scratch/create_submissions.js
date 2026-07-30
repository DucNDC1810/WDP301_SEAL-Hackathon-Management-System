import dotenv from "dotenv";
import mongoose from "mongoose";

// Load env
dotenv.config({ path: "../.env" });

// Load models
import "../src/models/Team.js";
import "../src/models/Round.js";
import "../src/models/Contest.js";
import "../src/models/Pool.js";
import "../src/models/Submission.js";

const Team = mongoose.model("Team");
const Round = mongoose.model("Round");
const Contest = mongoose.model("Contest");
const Pool = mongoose.model("Pool");
const Submission = mongoose.model("Submission");

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB database:", process.env.DB_DATABASE);

  // Find teams
  const teams = await Team.find({
    team_name: { $in: ["Đội Sấm Sét", "Đội Bão Tố"] }
  });

  if (teams.length === 0) {
    console.log("No teams found with names 'Đội Sấm Sét' or 'Đội Bão Tố'");
    await mongoose.disconnect();
    return;
  }

  for (const team of teams) {
    console.log(`\nProcessing submission for team: ${team.team_name} (${team._id})`);
    
    // Find the contest
    const contest = await Contest.findById(team.contest_id);
    if (!contest) {
      console.log(`Contest not found for team ${team.team_name}`);
      continue;
    }

    // Find the active round
    const activeRound = contest.rounds.find(r => r.is_active);
    if (!activeRound) {
      console.log(`No active round found for contest ${contest.title}`);
      continue;
    }

    console.log(`Active Round: ${activeRound.name} (${activeRound._id})`);

    // Check if submission already exists
    const existingSub = await Submission.findOne({
      team_id: team._id,
      round_id: activeRound._id
    });

    if (existingSub) {
      console.log(`Submission already exists for team ${team.team_name} in round ${activeRound.name}`);
      console.dir(existingSub.toObject());
      continue;
    }

    // Create a new submission
    const submission = await Submission.create({
      repo_url: "https://github.com/damchanduc1810/WDP301_SEAL-Hackathon-Management-System",
      slide_url: "https://docs.google.com/presentation/d/1example",
      demo_url: "https://example.com",
      team_id: team._id,
      round_id: activeRound._id,
      is_accessible: true,
      status: "SUBMITTED",
      submitted_at: new Date(),
      late_duration: 0
    });

    console.log(`Created submission successfully for ${team.team_name}:`);
    console.dir(submission.toObject());
  }

  await mongoose.disconnect();
}

run().catch(console.error);
