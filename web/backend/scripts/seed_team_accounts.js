import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import bcrypt from "bcrypt";
import Contest from "../src/models/Contest.js";
import Pool from "../src/models/Pool.js";
import Team from "../src/models/Team.js";
import User from "../src/models/User.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });

  console.log("Connected to MongoDB.");

  const contests = await Contest.find().sort({ created_at: -1 }).limit(1);
  if (contests.length === 0) {
    console.log("No contest found.");
    process.exit(0);
  }
  const contest = contests[0];
  
  const pools = await Pool.find({ contest_id: contest._id });
  
  const password_hash = await bcrypt.hash("123456", 10);
  const accounts = [];

  for (const pool of pools) {
    for (let i = 1; i <= 3; i++) {
      const teamName = `Team ${i} - ${pool.pool_name}`;
      const email = `team${i}_${pool.pool_name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@example.com`;
      
      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          email,
          full_name: `Leader ${teamName}`,
          password_hash,
          status: "active",
          is_verified: true,
          roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "contestant" }]
        });
        console.log(`Created user: ${email}`);
      }
      accounts.push({ team: teamName, email, password: "123456" });
      
      const team = await Team.findOne({ team_name: teamName, contest_id: contest._id });
      if (team) {
        team.leader_id = user._id;
        team.members = [{
           user_id: user._id,
           email: user.email,
           full_name: user.full_name,
           role: "leader"
        }];
        await team.save();
        console.log(`Assigned ${email} to ${teamName}`);
      }
    }
  }
  
  console.log("\n--- ACCOUNTS CREATED ---");
  console.table(accounts);

  await mongoose.disconnect();
}

run().catch(console.error);
