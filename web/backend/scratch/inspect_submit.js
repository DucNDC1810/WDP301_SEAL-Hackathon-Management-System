import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

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

  const teams = await Team.find({
    team_name: { $in: ["Đội Sấm Sét", "Đội Bão Tố"] }
  }).lean();

  console.log("Found Teams:");
  console.dir(teams, { depth: null });

  for (const team of teams) {
    console.log(`\n--- Inspecting team: ${team.team_name} ---`);
    if (team.contest_id) {
      const contest = await Contest.findById(team.contest_id).lean();
      console.log(`Contest: ${contest ? contest.title : "Not found"}`);
      if (contest && contest.rounds) {
        console.log("Contest Rounds:");
        console.dir(contest.rounds, { depth: null });
      }
    }
    if (team.pool_id) {
      const pool = await Pool.findById(team.pool_id).lean();
      console.log(`Pool: ${pool ? pool.pool_name : "Not found"}`);
      if (pool) {
        console.log(`Pool drive link: ${pool.drive_link}`);
      }
    }
    const submissions = await Submission.find({ team_id: team._id }).lean();
    console.log("Submissions:");
    console.dir(submissions, { depth: null });
  }

  await mongoose.disconnect();
}

run().catch(console.error);
