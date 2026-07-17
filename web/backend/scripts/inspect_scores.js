import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.MONGODB_CONNECTION_STRING;
const dbName = process.env.DB_DATABASE || "seal_hackathon";

async function main() {
  await mongoose.connect(connectionString, { dbName });
  console.log("Connected to MongoDB database:", dbName);

  const contestId = "6a590325bc78ac6f24385384";

  // Get contest
  const Contest = mongoose.model("Contest", new mongoose.Schema({}, { strict: false }));
  const contest = await Contest.findById(contestId);
  if (!contest) {
    console.log("Contest not found!");
    process.exit(1);
  }
  console.log("Contest Title:", contest.get("title"));
  console.log("Rounds:");
  const rounds = contest.get("rounds") || [];
  rounds.forEach(r => {
    console.log(`- Round Name: ${r.name}, ID: ${r._id}, Number: ${r.round_number}, Active: ${r.is_active}, Locked: ${r.scoring_locked}`);
  });

  const finalRound = rounds.find(r => r.name.toLowerCase().includes("chung kết") || r.name.toLowerCase().includes("final"));
  if (finalRound) {
    const roundId = finalRound._id.toString();
    console.log("\nInspecting Final Round:", finalRound.name, "ID:", roundId);

    // Get scores with mongoose.Types.ObjectId
    const Score = mongoose.model("Score", new mongoose.Schema({}, { strict: false }));
    const scores = await Score.find({ round_id: new mongoose.Types.ObjectId(roundId) });
    console.log(`Found ${scores.length} scores for final round:`);
    scores.forEach((s, idx) => {
      console.log(`Score ${idx + 1}: Team: ${s.get("team_id")}, Judge: ${s.get("judge_id")}, Score: ${s.get("total_score")}, Type: ${s.get("score_type")}, Status: ${s.get("status")}, IsFinal: ${s.get("is_final")}`);
    });

    // Get rankings
    const Ranking = mongoose.model("Ranking", new mongoose.Schema({}, { strict: false }));
    const rankings = await Ranking.find({ round_id: new mongoose.Types.ObjectId(roundId) });
    console.log(`Found ${rankings.length} rankings for final round:`);
    rankings.forEach((r, idx) => {
      console.log(`Ranking ${idx + 1}: Team: ${r.get("team_id")}, Name: ${r.get("team_name")}, FinalScore: ${r.get("final_score")}, Position: ${r.get("rank_position")}`);
    });
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
