import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Contest from "../src/models/Contest.js";
import Score from "../src/models/Score.js";
import ScoreDetail from "../src/models/ScoreDetail.js";
import Ranking from "../src/models/Ranking.js";

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

  // Find all score IDs for this round
  const scores = await Score.find({ contest_id: contest._id, round_id: roundId });
  const scoreIds = scores.map(s => s._id);

  // Delete ScoreDetails
  const detailResult = await ScoreDetail.deleteMany({ score_id: { $in: scoreIds } });
  console.log(`Deleted ${detailResult.deletedCount} score details.`);

  // Delete Scores
  const scoreResult = await Score.deleteMany({ contest_id: contest._id, round_id: roundId });
  console.log(`Deleted ${scoreResult.deletedCount} scores.`);

  // Delete Rankings
  const rankingResult = await Ranking.deleteMany({ contest_id: contest._id, round_id: roundId });
  console.log(`Deleted ${rankingResult.deletedCount} rankings.`);

  console.log("Database reset to unscored state for the active round.");
  await mongoose.disconnect();
}

run().catch(console.error);
