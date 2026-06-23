import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import JudgeAssignment from "../src/models/JudgeAssignment.js";
import Pool from "../src/models/Pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });

  const assignments = await JudgeAssignment.find().populate("pool_id").lean();
  console.log("Judge Assignments in DB:");
  assignments.forEach(a => {
    console.log(`- ID: ${a._id}`);
    console.log(`  contest_id: ${a.contest_id}`);
    console.log(`  round_id: ${a.round_id}`);
    console.log(`  pool_id: ${a.pool_id ? (a.pool_id.pool_name + ' (' + a.pool_id._id + ')') : 'null/undefined'}`);
    console.log(`  judge_id: ${a.judge_id}`);
    console.log(`  external_email: ${a.external_email}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
