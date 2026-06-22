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

  // Set 3 valid rounds with appropriate dates in the future
  const baseTime = Date.now();
  const deadline1 = new Date(baseTime + 24 * 60 * 60 * 1000); // +1 day
  const deadline2 = new Date(baseTime + 48 * 60 * 60 * 1000); // +2 days
  const deadline3 = new Date(baseTime + 72 * 60 * 60 * 1000); // +3 days

  contest.rounds = [
    {
      round_number: 1,
      name: "Vòng sơ loại",
      is_active: true,
      submission_deadline: deadline1,
      coding_duration_hours: 24,
      top_n_advance: 10,
      wildcard_enabled: true,
      score_criteria: []
    },
    {
      round_number: 2,
      name: "Vòng bán kết",
      is_active: true,
      submission_deadline: deadline2,
      coding_duration_hours: 24,
      top_n_advance: 5,
      wildcard_enabled: false,
      score_criteria: []
    },
    {
      round_number: 3,
      name: "Vòng chung kết",
      is_active: true,
      submission_deadline: deadline3,
      coding_duration_hours: 48,
      top_n_advance: 3,
      wildcard_enabled: false,
      score_criteria: []
    }
  ];

  await contest.save();
  console.log("Successfully created 3 valid rounds in DB!");

  // Query and print again to verify
  const updatedContest = await Contest.findById(contestId).lean();
  console.log("Rounds count in DB:", updatedContest.rounds.length);
  console.log("Rounds list:", JSON.stringify(updatedContest.rounds.map(r => ({
    round_number: r.round_number,
    name: r.name,
    is_active: r.is_active,
    submission_deadline: r.submission_deadline
  })), null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
