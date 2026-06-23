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
  const contest = await Contest.findById(contestId);

  // Restore to only 2 rounds with their original names and settings
  contest.rounds = [
    {
      round_number: 1,
      name: "Vòng sơ loại",
      is_active: true,
      submission_deadline: new Date("2026-06-11T19:00:00.000Z"),
      coding_duration_hours: 24,
      top_n_advance: 10,
      wildcard_enabled: true,
      score_criteria: []
    },
    {
      round_number: 2,
      name: "chung ket1",
      is_active: true,
      submission_deadline: new Date("2026-06-12T19:00:00.000Z"),
      coding_duration_hours: 48,
      top_n_advance: 3,
      wildcard_enabled: false,
      score_criteria: []
    }
  ];

  await contest.save();
  console.log("Restored contest rounds to original DB state successfully!");

  await mongoose.disconnect();
}

run().catch(console.error);
