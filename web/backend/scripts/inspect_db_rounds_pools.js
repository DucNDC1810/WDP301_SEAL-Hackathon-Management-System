import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Contest from "../src/models/Contest.js";
import Pool from "../src/models/Pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });

  const contests = await Contest.find().sort({ created_at: -1 }).limit(1);
  if (contests.length === 0) {
    console.log("No contests.");
    process.exit(0);
  }
  const contest = contests[0];
  console.log("Contest:", contest.title, contest._id);
  console.log("Rounds:", contest.rounds.map(r => ({ id: r._id, title: r.title, is_active: r.is_active })));

  const pools = await Pool.find({ contest_id: contest._id });
  console.log("\nPools in DB:");
  pools.forEach(p => {
    console.log(`- ${p.pool_name}: round_id=${p.round_id}, teams count=${p.teams.length}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
