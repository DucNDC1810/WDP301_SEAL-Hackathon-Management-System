import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import JudgeAssignment from "../src/models/JudgeAssignment.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });

  const assignments = await JudgeAssignment.find().lean();
  console.log("Raw Judge Assignments in DB:");
  assignments.forEach(a => {
    console.log(`- ID: ${a._id}`);
    console.log(`  pool_id (raw): ${a.pool_id}`);
    console.log(`  round_id: ${a.round_id}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
