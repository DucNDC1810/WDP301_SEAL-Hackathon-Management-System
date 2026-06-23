import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Contest from "../src/models/Contest.js";
import Pool from "../src/models/Pool.js";
import PresentationSlot from "../src/models/PresentationSlot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });

  console.log("Connected to MongoDB.");

  const contests = await Contest.find().sort({ created_at: -1 }).limit(1);
  if (contests.length === 0) {
    console.log("No contests.");
    process.exit(0);
  }
  const contest = contests[0];
  const activeRound = contest.rounds[0];
  const roundId = activeRound._id;

  // Clean existing slots for this round
  await PresentationSlot.deleteMany({ contest_id: contest._id, round_id: roundId });
  console.log("Deleted old presentation slots.");

  const pools = await Pool.find({ contest_id: contest._id, round_id: roundId });
  
  const now = new Date();
  
  for (const pool of pools) {
    console.log(`Pool: ${pool.pool_name}`);
    for (let tIdx = 0; tIdx < pool.teams.length; tIdx++) {
      const teamId = pool.teams[tIdx];
      
      // Calculate times: e.g. start_time in the past to pass timing check
      const start = new Date(now.getTime() - (30 - tIdx * 15) * 60 * 1000); // 30 mins ago, 15 mins ago...
      const end = new Date(start.getTime() + 45 * 60 * 1000); // 45 mins slot
      
      await PresentationSlot.create({
        contest_id: contest._id,
        round_id: roundId,
        pool_id: pool._id,
        start_time: start,
        end_time: end,
        room: `Room ${pool.pool_name.replace(/[^a-zA-Z0-9]/g, "")}`,
        booked_team_id: teamId,
        booked_at: new Date(),
        status: "booked",
        note: `Presentation slot for team ${tIdx + 1}`
      });
      console.log(`Created PresentationSlot for team ${teamId} in pool ${pool.pool_name}`);
    }
  }

  console.log("Done generating presentation slots.");
  await mongoose.disconnect();
}

run().catch(console.error);
