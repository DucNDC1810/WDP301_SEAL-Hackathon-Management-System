import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Contest from "../src/models/Contest.js";
import Pool from "../src/models/Pool.js";
import Team from "../src/models/Team.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });

  const contests = await Contest.find().sort({ created_at: -1 }).limit(1);
  if (contests.length === 0) {
    console.log("No contests.");
    process.exit(0);
  }
  const contest = contests[0];
  console.log("Contest:", contest.title, contest._id);
  
  // Set rounds: first active, second inactive
  if (contest.rounds && contest.rounds.length >= 2) {
    contest.rounds[0].is_active = true;
    contest.rounds[1].is_active = false;
    await contest.save();
    console.log("Updated rounds activity status.");
  }
  
  const activeRound = contest.rounds.find(r => r.is_active);
  console.log("Active round is:", activeRound.name || "Vòng sơ loại", activeRound._id);

  // Update pools of this contest to have the active round_id
  const pools = await Pool.find({ contest_id: contest._id });
  for (const pool of pools) {
    pool.round_id = activeRound._id;
    await pool.save();
    console.log(`Updated pool ${pool.pool_name} with round_id: ${activeRound._id}`);
  }

  // Also ensure teams are ACTIVE and assigned correctly
  const teams = await Team.find({ contest_id: contest._id });
  for (const team of teams) {
    if (team.status !== "ACTIVE") {
      team.status = "ACTIVE";
      await team.save();
      console.log(`Updated team status to ACTIVE: ${team.team_name}`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
