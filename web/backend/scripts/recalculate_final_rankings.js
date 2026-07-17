import mongoose from "mongoose";
import dotenv from "dotenv";
import { calculateRankings } from "../src/services/rankingService.js";
dotenv.config();

const connectionString = process.env.MONGODB_CONNECTION_STRING;
const dbName = process.env.DB_DATABASE || "seal_hackathon";

async function main() {
  await mongoose.connect(connectionString, { dbName });
  console.log("Connected to MongoDB database:", dbName);

  const contestId = "6a590325bc78ac6f24385384";
  const roundId = "6a590325bc78ac6f24385386"; // Final round

  console.log("Calculating rankings for final round...");
  const rankings = await calculateRankings(contestId, roundId);
  console.log(`Successfully calculated ${rankings.length} rankings:`);
  rankings.forEach((r, idx) => {
    console.log(`Rank ${idx + 1}: Team ID: ${r.team_id}, Name: ${r.team_name}, Score: ${r.final_score}`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error("Error calculating rankings:", err);
  process.exit(1);
});
