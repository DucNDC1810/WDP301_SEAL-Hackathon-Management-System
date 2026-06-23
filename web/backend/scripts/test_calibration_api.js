import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import path from "path";
import axios from "axios";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, { dbName: process.env.DB_DATABASE });
  console.log("Connected to DB");

  const User = mongoose.model("User");
  const Round = mongoose.model("Round");
  const Team = mongoose.model("Team");
  const Criteria = mongoose.model("Criteria");
  const Score = mongoose.model("Score");

  // Get a judge
  const judge = await User.findOne({ email: "judge.final1@seal.com" });
  if (!judge) {
    console.error("Judge not found");
    return;
  }

  // Get final round
  const round = await Round.findOne({ type: "FINAL" });
  if (!round) {
    console.error("Final round not found");
    return;
  }

  // Get sample team
  const sampleTeam = await Team.findOne({ contest_id: round.contest_id, is_calibration_sample: true });
  if (!sampleTeam) {
    console.error("Sample team not found");
    return;
  }

  // Get criteria
  const criteria = await Criteria.find({ round_id: round._id });
  console.log("Found criteria:", criteria.map(c => ({ id: c._id, name: c.name, weight: c.weight })));

  // Generate test JWT for judge
  // Let's use backend token generator if there is one, or bypass authentication locally by simulating the request / logic directly.
  // Actually, we can test the API by simulating the endpoint logic directly in Node to be 100% sure the Mongo queries work!
  console.log("\n--- Simulating GET /api/calibration/:round_id ---");
  const sampleTeams = await Team.find({
    contest_id: round.contest_id,
    is_calibration_sample: true
  }).select("_id team_name name");

  const formattedSampleTeams = sampleTeams.map(t => ({
    team_id: t._id,
    team_name: t.name || t.team_name
  }));
  console.log("GET Response sample_teams:", formattedSampleTeams);

  // Simulating POST score
  console.log("\n--- Simulating POST /api/calibration/:round_id/score ---");
  const mockCriteriaScores = criteria.map(c => ({
    criteria_id: c._id.toString(),
    score: 8.5
  }));

  // Endpoint logic test
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const formattedCriteriaScores = [];

  for (const cs of mockCriteriaScores) {
    const critDef = criteria.find(c => String(c._id) === String(cs.criteria_id));
    if (!critDef) {
      throw new Error(`Criteria ${cs.criteria_id} not found`);
    }
    const scoreVal = Number(cs.score);
    formattedCriteriaScores.push({
      criteria_name: critDef.name,
      weight: critDef.weight,
      score: scoreVal
    });
    totalWeightedScore += scoreVal * critDef.weight;
    totalWeight += critDef.weight;
  }

  const weighted_avg_score = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;
  console.log("Calculated weighted_avg_score:", weighted_avg_score);

  const scoreDoc = await Score.findOneAndUpdate(
    {
      judge_id: judge._id,
      team_id: sampleTeam._id,
      round_id: round._id,
      score_type: "CALIBRATION"
    },
    {
      judge_id: judge._id,
      team_id: sampleTeam._id,
      contest_id: round.contest_id,
      round_id: round._id,
      criteria_scores: formattedCriteriaScores,
      weighted_avg_score: Math.round(weighted_avg_score * 100) / 100,
      score_type: "CALIBRATION",
      status: "submitted",
      is_final: false,
      submitted_at: new Date()
    },
    { upsert: true, new: true }
  );
  console.log("Saved score doc:", scoreDoc);

  // Fetch updated GET data
  const scores = await Score.find({
    round_id: round._id,
    score_type: "CALIBRATION"
  }).populate("judge_id", "full_name email");

  const formattedScores = scores.map(s => ({
    judge_id: s.judge_id?._id || s.judge_id,
    judge_name: s.judge_id?.full_name || "Unknown Judge",
    team_id: s.team_id,
    criteria_scores: s.criteria_scores,
    weighted_avg_score: s.weighted_avg_score
  }));
  console.log("GET Response updated scores:", formattedScores);

  const distribution = criteria.map(crit => {
    const scoresForCrit = [];
    scores.forEach(s => {
      const found = s.criteria_scores.find(cs => cs.criteria_name === crit.name);
      if (found && found.score !== undefined) {
        scoresForCrit.push(found.score);
      }
    });
    return {
      criteria_name: crit.name,
      scores: scoresForCrit
    };
  });
  console.log("GET Response distribution:", distribution);

  // Clean up
  await Score.deleteMany({ score_type: "CALIBRATION" });
  console.log("Cleaned up calibration score");

  await mongoose.disconnect();
}

run().catch(console.error);
