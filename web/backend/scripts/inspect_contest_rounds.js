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
  console.log("Connected to MongoDB.");

  const contestId = "6a384760a0f8f698410fd360";
  const contest = await Contest.findById(contestId).lean();

  console.log("\n--- CONTEST DETAILS ---");
  console.log("Title:", contest.title);
  console.log("Rounds count:", contest.rounds ? contest.rounds.length : 0);
  console.log("Rounds:", JSON.stringify(contest.rounds, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
