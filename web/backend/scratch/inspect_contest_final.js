import dotenv from "dotenv";
import mongoose from "mongoose";

// Load env
dotenv.config({ path: "../.env" });

// Load models
import "../src/models/Contest.js";
import "../src/models/Team.js";
import "../src/models/Round.js";

const Contest = mongoose.model("Contest");
const Team = mongoose.model("Team");
const Round = mongoose.model("Round");

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB database:", process.env.DB_DATABASE);

  const contestId = new mongoose.Types.ObjectId("6a6af133cebafb8834c42f32");
  const contest = await Contest.findById(contestId).lean();
  console.log(`Contest: "${contest ? contest.title : "Not found"}"`);

  if (contest) {
    console.log("Rounds:");
    console.dir(contest.rounds, { depth: null });

    const teams = await Team.find({ contest_id: contestId }).lean();
    console.log(`Teams count: ${teams.length}`);
    teams.forEach(t => {
      console.log(`- Team: ${t.team_name}, Status: ${t.status}, Pool: ${t.pool_id}`);
    });
  }

  await mongoose.disconnect();
}

run().catch(console.error);
