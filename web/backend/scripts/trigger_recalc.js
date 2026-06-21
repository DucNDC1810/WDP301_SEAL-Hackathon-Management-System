import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { calculateRankings } from "../src/services/rankingService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB.");

  const contestId = "6a384760a0f8f698410fd360";
  const roundId = "6a384760a0f8f698410fd361";
  
  console.log("Recalculating rankings...");
  const rankings = await calculateRankings(contestId, roundId);
  console.log("Rankings calculated successfully:");
  console.log(JSON.stringify(rankings, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
