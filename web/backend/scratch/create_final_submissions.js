import dotenv from "dotenv";
import mongoose from "mongoose";

// Load env
dotenv.config({ path: "../.env" });

// Load models
import "../src/models/Team.js";
import "../src/models/Round.js";
import "../src/models/Contest.js";
import "../src/models/Pool.js";
import "../src/models/FinalSubmission.js";

const Team = mongoose.model("Team");
const Round = mongoose.model("Round");
const Contest = mongoose.model("Contest");
const FinalSubmission = mongoose.model("FinalSubmission");

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB database:", process.env.DB_DATABASE);

  // Find teams
  const teams = await Team.find({
    team_name: { $in: ["Đội Sấm Sét", "Đội Bão Tố"] }
  });

  for (const team of teams) {
    console.log(`\nProcessing final submission for team: ${team.team_name} (${team._id})`);
    
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

    console.log(`Active Round: ${activeRound.name} (${activeRound._id}), Number: ${activeRound.round_number}`);

    if (activeRound.round_number !== 2) {
      console.log(`Active round is not round 2 (it is ${activeRound.round_number}). Skipping FinalSubmission.`);
      continue;
    }

    // Prepare criteria submissions
    const criteria_submissions = (activeRound.score_criteria || []).map(criteria => ({
      criteria_id: criteria._id,
      criteria_name: criteria.name,
      file_url: "https://drive.google.com/drive/home",
      note: "Submitted programmatically"
    }));

    // Check if final submission already exists
    const existingSub = await FinalSubmission.findOne({
      team_id: team._id,
      round_id: activeRound._id
    });

    if (existingSub) {
      console.log(`FinalSubmission already exists for team ${team.team_name} in round ${activeRound.name}`);
      console.dir(existingSub.toObject());
      continue;
    }

    // Create a new final submission
    const submission = await FinalSubmission.create({
      team_id: team._id,
      round_id: activeRound._id,
      criteria_submissions,
      status: "SUBMITTED",
      submitted_at: new Date()
    });

    console.log(`Created FinalSubmission successfully for ${team.team_name}:`);
    console.dir(submission.toObject());
  }

  await mongoose.disconnect();
}

run().catch(console.error);
