import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Contest from "../src/models/Contest.js";
import Pool from "../src/models/Pool.js";
import Team from "../src/models/Team.js";
import User from "../src/models/User.js";
import JudgeAssignment from "../src/models/JudgeAssignment.js";
import Score from "../src/models/Score.js";
import ScoreDetail from "../src/models/ScoreDetail.js";
import { calculateRankings } from "../src/services/rankingService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });

  console.log("Connected to MongoDB.");

  const contests = await Contest.find().sort({ created_at: -1 }).limit(1);
  if (contests.length === 0) {
    console.log("No contests.");
    process.exit(0);
  }
  const contest = contests[0];
  console.log("Contest:", contest.title, contest._id);

  // 1. Ensure contest rounds have criteria and first round is active, scoring is locked to simulate finished
  const criteria = [
    { name: "Source Code", max_score: 10, weight: 0.5, description: "Quality and completeness of source code" },
    { name: "Presentation", max_score: 10, weight: 0.3, description: "Presentation and slides" },
    { name: "Demo Video", max_score: 10, weight: 0.2, description: "Video demonstration" }
  ];

  if (contest.rounds && contest.rounds.length > 0) {
    contest.rounds[0].score_criteria = criteria;
    contest.rounds[0].is_active = true;
    contest.rounds[0].scoring_locked = true; // Lock scoring to show ended
    
    if (contest.rounds.length > 1) {
      contest.rounds[1].is_active = false;
      contest.rounds[1].scoring_locked = false;
    }
    
    await contest.save();
    console.log("Updated round criteria and locked scoring.");
  }
  
  const activeRound = contest.rounds[0];
  const roundId = activeRound._id;

  // 2. Find judges to assign
  const judge1 = await User.findOne({ email: "judge1@example.com" });
  const judge2 = await User.findOne({ email: "judge2@example.com" });
  const judge3 = await User.findOne({ email: "judge3@example.com" });

  if (!judge1 || !judge2 || !judge3) {
    console.log("Error: Judges not found. Please run seed_judges_mentors.js first.");
    process.exit(1);
  }

  // 3. Clear existing assignments/scores for this round to prevent unique key violations
  await JudgeAssignment.deleteMany({ contest_id: contest._id, round_id: roundId });
  await Score.deleteMany({ contest_id: contest._id, round_id: roundId });
  
  // Find all scores to get their IDs and delete details
  const oldScores = await Score.find({ contest_id: contest._id, round_id: roundId }).select("_id");
  const oldScoreIds = oldScores.map(s => s._id);
  await ScoreDetail.deleteMany({ score_id: { $in: oldScoreIds } });

  const pools = await Pool.find({ contest_id: contest._id, round_id: roundId });
  console.log(`Found ${pools.length} pools.`);

  const judgeMap = [judge1, judge2, judge3];

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];
    const judge = judgeMap[i % judgeMap.length];

    // Assign Judge to Pool
    await JudgeAssignment.create({
      contest_id: contest._id,
      round_id: roundId,
      pool_id: pool._id,
      judge_id: judge._id,
      judge_type: "INTERNAL",
      invitation_status: "active"
    });
    console.log(`Assigned ${judge.email} to ${pool.pool_name}`);

    // Create mock scores for each team in this pool
    for (let tIdx = 0; tIdx < pool.teams.length; tIdx++) {
      const teamId = pool.teams[tIdx];
      const team = await Team.findById(teamId);
      if (!team) continue;

      // Mock random scores for criteria
      const codeScoreVal = 7 + Math.random() * 3; // 7 to 10
      const presScoreVal = 6 + Math.random() * 4; // 6 to 10
      const demoScoreVal = 5 + Math.random() * 5; // 5 to 10

      const criteriaScores = [
        { criteria_name: "Source Code", weight: 0.5, score: parseFloat(codeScoreVal.toFixed(1)) },
        { criteria_name: "Presentation", weight: 0.3, score: parseFloat(presScoreVal.toFixed(1)) },
        { criteria_name: "Demo Video", weight: 0.2, score: parseFloat(demoScoreVal.toFixed(1)) }
      ];

      const totalWeighted = (codeScoreVal * 0.5) + (presScoreVal * 0.3) + (demoScoreVal * 0.2);
      const totalScoreSum = codeScoreVal + presScoreVal + demoScoreVal;

      const scoreDoc = await Score.create({
        contest_id: contest._id,
        round_id: roundId,
        team_id: team._id,
        judge_id: judge._id,
        criteria_scores: criteriaScores,
        weighted_avg_score: parseFloat(totalWeighted.toFixed(2)),
        total_score: parseFloat(totalScoreSum.toFixed(2)),
        comment: `Excellent work by ${team.team_name}!`,
        score_type: "NORMAL",
        status: "submitted",
        is_final: true,
        submitted_at: new Date()
      });

      // Create ScoreDetails
      await ScoreDetail.create([
        { score_id: scoreDoc._id, criteria_name: "Source Code", score_value: parseFloat(codeScoreVal.toFixed(1)), weight: 0.5, max_score: 10 },
        { score_id: scoreDoc._id, criteria_name: "Presentation", score_value: parseFloat(presScoreVal.toFixed(1)), weight: 0.3, max_score: 10 },
        { score_id: scoreDoc._id, criteria_name: "Demo Video", score_value: parseFloat(demoScoreVal.toFixed(1)), weight: 0.2, max_score: 10 }
      ]);

      console.log(`Scored team ${team.team_name} in ${pool.pool_name} with average ${totalWeighted.toFixed(2)}`);
    }
  }

  // 4. Calculate rankings
  console.log("Calculating rankings...");
  await calculateRankings(contest._id.toString(), roundId.toString());
  console.log("Rankings calculated and saved successfully.");

  await mongoose.disconnect();
}

run().catch(console.error);
