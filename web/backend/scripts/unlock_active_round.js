import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Contest from "../src/models/Contest.js";

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

  if (contest.rounds && contest.rounds.length > 0) {
    contest.rounds[0].is_active = true;
    contest.rounds[0].scoring_locked = false; // UNLOCK
    await contest.save();
    console.log("Active round scoring unlocked.");
  }

  await mongoose.disconnect();
}

run().catch(console.error);
