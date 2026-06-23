import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Team from "../src/models/Team.js";
import User from "../src/models/User.js"; // Import registers model with mongoose

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });

  const teams = await Team.find({ team_name: /3/ }).populate("leader_id");
  console.log("Matching Teams with 3:");
  teams.forEach(t => {
    console.log(`- Team Name: ${t.team_name}`);
    console.log(`  Leader Email: ${t.leader_id?.email}`);
    console.log(`  Leader Name: ${t.leader_id?.full_name}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
