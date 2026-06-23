import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Contest from "../src/models/Contest.js";
import Pool from "../src/models/Pool.js";
import Team from "../src/models/Team.js";
import User from "../src/models/User.js";
import FinalSubmission from "../src/models/FinalSubmission.js";

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
  console.log("Target Contest:", contest.title, contest._id);
  
  let leader = await User.findOne({ email: "leader_test@example.com" });
  if (!leader) {
    leader = await User.create({
      email: "leader_test@example.com",
      full_name: "Leader Test",
      status: "active"
    });
  }

  const pools = await Pool.find({ contest_id: contest._id });
  console.log(`Found ${pools.length} pools for this contest.`);
  
  const activeRound = contest.rounds ? contest.rounds.find(r => r.is_active) : (contest.rounds && contest.rounds.length > 0 ? contest.rounds[0] : null);

  for (const pool of pools) {
    console.log(`Processing Pool: ${pool.pool_name}`);
    for (let i = 1; i <= 3; i++) {
      const teamName = `Team ${i} - ${pool.pool_name}`;
      let team = await Team.findOne({ team_name: teamName, contest_id: contest._id });
      if (!team) {
        team = await Team.create({
          contest_id: contest._id,
          team_name: teamName,
          name: teamName,
          leader_id: leader._id,
          status: "ACTIVE", // Eligible for scoring
          pool_id: pool._id,
          members: [{
             user_id: leader._id,
             email: leader.email,
             full_name: "Leader Test",
             role: "leader"
          }]
        });
        console.log(`Created Team: ${teamName}`);
      } else {
        team.status = "ACTIVE";
        team.pool_id = pool._id;
        await team.save();
        console.log(`Updated Team: ${teamName}`);
      }
      
      // Update pool's teams array
      if (!pool.teams.includes(team._id)) {
        pool.teams.push(team._id);
      }
      
      // Add final submission to be completely eligible for scoring in the active round
      if (activeRound) {
         let submission = await FinalSubmission.findOne({ team_id: team._id, round_id: activeRound._id });
         if (!submission) {
            await FinalSubmission.create({
               team_id: team._id,
               round_id: activeRound._id,
               status: "SUBMITTED"
            });
            console.log(`Created FinalSubmission for Team: ${teamName}`);
         }
      }
    }
    await pool.save();
  }
  
  // Update contest round's is_active just in case none was active so it can be scored
  if (!contest.rounds.find(r => r.is_active) && contest.rounds.length > 0) {
      contest.rounds[0].is_active = true;
      await contest.save();
      console.log("Set first round as active");
  }

  console.log("Done generating teams.");
  await mongoose.disconnect();
}

run().catch(console.error);
