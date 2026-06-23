import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Score from "../src/models/Score.js";
import ScoreDetail from "../src/models/ScoreDetail.js";
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
  const scores = await Score.find({ contest_id: contestId })
    .populate("judge_id", "full_name email")
    .populate("team_id", "team_name")
    .lean();

  console.log("\n--- SCORES ---");
  console.log(JSON.stringify(scores, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
