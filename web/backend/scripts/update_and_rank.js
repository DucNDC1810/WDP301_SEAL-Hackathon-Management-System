import mongoose from "mongoose";
import dotenv from "dotenv";
import Team from "../src/models/Team.js";
import Score from "../src/models/Score.js";
import Round from "../src/models/Round.js";
import { triggerReRank } from "../src/services/roundService.js";

dotenv.config({ path: ".env" });

async function run() {
  const uri = process.env.MONGODB_CONNECTION_STRING;
  const dbName = process.env.DB_DATABASE || "seal_hackathon";
  
  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri, { dbName });
  console.log("Connected successfully!");

  const roundId = "6a3bca495cf18bff2565538b";
  const contestId = "6a3bca495cf18bff2565538a";

  console.log("Updating Team statuses to ACTIVE...");
  const teamUpdateResult = await Team.updateMany(
    { contest_id: contestId },
    { status: "ACTIVE" }
  );
  console.log(`Updated ${teamUpdateResult.modifiedCount} teams to ACTIVE.`);

  console.log("Copying total_score to weighted_avg_score and setting is_final: true...");
  const scores = await Score.find({ round_id: roundId });
  let count = 0;
  for (const score of scores) {
    score.weighted_avg_score = score.total_score;
    score.is_final = true;
    await score.save();
    count++;
  }
  console.log(`Updated ${count} scores successfully.`);

  console.log("Triggering leaderboard re-ranking...");
  await triggerReRank(contestId, roundId, null);
  console.log("Re-ranking completed successfully!");

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

run().catch((err) => {
  console.error("Error running script:", err);
  process.exit(1);
});
