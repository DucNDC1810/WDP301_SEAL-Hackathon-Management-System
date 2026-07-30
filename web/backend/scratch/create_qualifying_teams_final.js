import dotenv from "dotenv";
import mongoose from "mongoose";

// Load env
dotenv.config({ path: "../.env" });

// Load models
import "../src/models/Contest.js";
import "../src/models/Round.js";
import "../src/models/Team.js";
import "../src/models/User.js";
import "../src/models/Ranking.js";
import "../src/models/Pool.js";
import "../src/models/Submission.js";

const Contest = mongoose.model("Contest");
const Round = mongoose.model("Round");
const Team = mongoose.model("Team");
const User = mongoose.model("User");
const Ranking = mongoose.model("Ranking");
const Pool = mongoose.model("Pool");
const Submission = mongoose.model("Submission");

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB database:", process.env.DB_DATABASE);

  const contestId = new mongoose.Types.ObjectId("6a6af133cebafb8834c42f32");
  const contest = await Contest.findById(contestId);
  if (!contest) {
    console.error("Contest not found!");
    await mongoose.disconnect();
    return;
  }

  // 1. Get round IDs and update active statuses
  const round1 = contest.rounds.find(r => r.round_number === 1);
  const round2 = contest.rounds.find(r => r.round_number === 2);

  if (!round1 || !round2) {
    console.error("Round 1 or Round 2 not found in contest!");
    await mongoose.disconnect();
    return;
  }

  // Set Round 1 to inactive (finished) and past deadline
  round1.is_active = false;
  round1.submission_deadline = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

  // Set Round 2 to inactive (preparing to activate)
  round2.is_active = false;
  round2.submission_deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now (future deadline)

  await contest.save();
  console.log("Updated Contest rounds in Contest document (both inactive).");

  // Also update standalone Round documents
  await Round.updateOne({ _id: round1._id }, { $set: { is_active: false, submission_deadline: round1.submission_deadline } });
  await Round.updateOne({ _id: round2._id }, { $set: { is_active: false, submission_deadline: round2.submission_deadline } });
  console.log("Updated standalone Round documents (both inactive).");

  // Find or create pools for this contest
  let pools = await Pool.find({ contest_id: contestId });
  if (pools.length === 0) {
    const newPoolA = await Pool.create({
      contest_id: contestId,
      round_id: round1._id,
      pool_name: "Bảng A",
      description: "Bảng đấu A"
    });
    const newPoolB = await Pool.create({
      contest_id: contestId,
      round_id: round1._id,
      pool_name: "Bảng B",
      description: "Bảng đấu B"
    });
    pools = [newPoolA, newPoolB];
    console.log("Created Bảng A and Bảng B for the contest.");
  }
  const poolA = pools.find(p => p.pool_name.includes("A")) || pools[0];
  const poolB = pools.find(p => p.pool_name.includes("B")) || pools[1] || pools[0];

  const teamsData = [
    {
      name: "Đội Sao Băng",
      email: "saobang@example.com",
      pool: poolA
    },
    {
      name: "Đội Phượng Hoàng",
      email: "phuonghoang@example.com",
      pool: poolB
    }
  ];

  for (const tData of teamsData) {
    // Check if user exists, else create
    let user = await User.findOne({ email: tData.email });
    if (!user) {
      user = await User.create({
        full_name: `${tData.name} Leader`,
        email: tData.email,
        is_verified: true,
        roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "contestant" }]
      });
      console.log(`Created user: ${user.email}`);
    }

    // Check if team exists, else create
    let team = await Team.findOne({ team_name: tData.name, contest_id: contestId });
    if (!team) {
      team = await Team.create({
        contest_id: contestId,
        team_name: tData.name,
        leader_id: user._id,
        status: "CONFIRMED",
        pool_id: tData.pool ? tData.pool._id : null,
        members: [{
          user_id: user._id,
          email: user.email,
          full_name: user.full_name,
          email_verified: true,
          role: "leader"
        }]
      });
      console.log(`Created team: ${team.team_name}`);
    } else {
      team.status = "CONFIRMED";
      if (tData.pool) {
        team.pool_id = tData.pool._id;
      }
      await team.save();
      console.log(`Updated team: ${team.team_name}`);
    }

    // 2. Create Round 1 Submission for the team
    let sub1 = await Submission.findOne({ team_id: team._id, round_id: round1._id });
    if (!sub1) {
      sub1 = await Submission.create({
        team_id: team._id,
        round_id: round1._id,
        repo_url: `https://github.com/${tData.email.split("@")[0]}/round1-project`,
        slide_url: `https://docs.google.com/presentation/d/${tData.email.split("@")[0]}-slide`,
        status: "SUBMITTED"
      });
      console.log(`Created Round 1 submission for ${team.team_name}`);
    }

    // 3. Create Ranking for Round 1 showing they are qualified: true
    let ranking = await Ranking.findOne({ contest_id: contestId, round_id: round1._id, team_id: team._id });
    if (!ranking) {
      ranking = await Ranking.create({
        contest_id: contestId,
        round_id: round1._id,
        board_id: team.pool_id,
        team_id: team._id,
        team_name: team.team_name,
        final_score: 9.5,
        rank_position: 1,
        qualified: true
      });
      console.log(`Created qualifying Ranking record for ${team.team_name} in Round 1.`);
    } else {
      ranking.qualified = true;
      await ranking.save();
      console.log(`Ensured qualifying Ranking record for ${team.team_name} is true.`);
    }

    // 4. Ensure there is NO submission for Round 2 yet (so they are working on it)
    await Submission.deleteMany({ team_id: team._id, round_id: round2._id });
    console.log(`Cleared any Round 2 submissions for ${team.team_name} so they are currently preparing to submit.`);
  }

  await mongoose.disconnect();
  console.log("Database operations completed.");
}

run().catch(console.error);
