import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import User from "../src/models/User.js";
import Contest from "../src/models/Contest.js";
import Team from "../src/models/Team.js";
import Round from "../src/models/Round.js";
import Score from "../src/models/Score.js";
import Submission from "../src/models/Submission.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function seed() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB for seeding...");

  // Clear previous sample contests/rounds/teams/scores/submissions to start fresh
  const sampleContest = await Contest.findOne({ title: "Giải đấu Hackathon Sơ Loại Mẫu 2026" });
  if (sampleContest) {
    await Contest.deleteOne({ _id: sampleContest._id });
    await Round.deleteMany({ contest_id: sampleContest._id });
    await Team.deleteMany({ contest_id: sampleContest._id });
    await Score.deleteMany({ contest_id: sampleContest._id });
    await Submission.deleteMany({ round_id: { $in: await Round.find({ contest_id: sampleContest._id }).distinct("_id") } });
    console.log("Cleared existing sample contest data");
  }

  // 1. Get or create a user for leader/judge
  let user = await User.findOne({});
  if (!user) {
    user = await User.create({
      email: "admin@seal.com",
      full_name: "Admin SEAL",
      password: "password123",
      roles: [{ role_name: "admin" }]
    });
    console.log("Created dummy user:", user.email);
  } else {
    console.log("Using existing user:", user.email);
  }

  // 2. Create a contest
  const contest = await Contest.create({
    title: "Giải đấu Hackathon Sơ Loại Mẫu 2026",
    description: "Giải đấu dành riêng cho kiểm thử Leaderboard Sơ loại và Tiebreak",
    status: "open",
    created_by: user._id,
    wildcard_enabled: true,
  });
  console.log("Created Contest:", contest.title, "ID:", contest._id);

  // 3. Create a Round with top_n: 2
  const round = await Round.create({
    contest_id: contest._id,
    name: "Vòng Sơ Loại Hackathon 2026",
    type: "PRELIMINARY",
    is_active: true,
    top_n: 2,
    wildcard_enabled: true,
    wildcard_count: 2,
    round_start: new Date(),
    round_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  console.log("Created Round:", round.name, "ID:", round._id);

  // 4. Create 6 Teams (with tiebreaks)
  const teamsData = [
    { name: "Đội Cyber Knights", group: "Bảng A", score: 9.2, tiebreak_rule: 'SUBMISSION_TIME', tiebreak_status: 'RESOLVED', penalty_score: 1, submission_offset_mins: 30 },
    { name: "Đội Code Wizards", group: "Bảng A", score: 9.2, tiebreak_rule: 'SUBMISSION_TIME', tiebreak_status: 'ESCALATED', penalty_score: 3, submission_offset_mins: 45 },
    { name: "Đội Dev Masters", group: "Bảng A", score: 9.7, submission_offset_mins: 15 },
    { name: "Đội Block Builders", group: "Bảng B", score: 8.0, tiebreak_rule: 'PENALTY_SCORE', tiebreak_status: 'PENDING', penalty_score: 2, submission_offset_mins: 50 },
    { name: "Đội Space Miners", group: "Bảng B", score: 9.5, submission_offset_mins: 20 },
    { name: "Đội Quantum Coders", group: "Bảng B", score: 8.0, tiebreak_rule: 'PENALTY_SCORE', tiebreak_status: 'PENDING', penalty_score: 0, submission_offset_mins: 60 }
  ];

  for (const t of teamsData) {
    const team = await Team.create({
      contest_id: contest._id,
      team_name: t.name,
      name: t.name,
      assigned_group: t.group,
      leader_id: user._id,
      status: "ACTIVE",
      tiebreak_rule: t.tiebreak_rule || null,
      tiebreak_status: t.tiebreak_status || null,
      penalty_score: t.penalty_score || 0
    });

    console.log(`Created Team: ${team.team_name} in group ${team.assigned_group}`);

    // Create a mock submission
    await Submission.create({
      repo_url: "https://github.com/test/repo",
      slide_url: "https://slides.com/test",
      team_id: team._id,
      round_id: round._id,
      status: "SUBMITTED",
      submitted_at: new Date(Date.now() - (t.submission_offset_mins || 0) * 60 * 1000)
    });

    // Create Score for team
    const technicalScore = t.score + 0.1;
    const ideaScore = t.score - 0.1;
    const weightedAvg = (technicalScore * 0.6) + (ideaScore * 0.4);

    await Score.create({
      team_id: team._id,
      round_id: round._id,
      judge_id: user._id,
      contest_id: contest._id,
      criteria_scores: [
        { criteria_name: "Kỹ thuật & Code", weight: 0.6, score: technicalScore },
        { criteria_name: "Ý tưởng & Thuyết trình", weight: 0.4, score: ideaScore }
      ],
      weighted_avg_score: Math.round(weightedAvg * 100) / 100,
      score_type: "NORMAL",
      is_final: true,
      status: "submitted",
      submitted_at: new Date()
    });

    console.log(`  Added Score for ${team.team_name} with Weighted Average: ${Math.round(weightedAvg * 100) / 100}`);
  }

  console.log("\n==========================================");
  console.log("SEEDING COMPLETED SUCCESSFULLY!");
  console.log(`Please visit the following URL to view the Leaderboard:`);
  console.log(`http://localhost:5173/leaderboard/${round._id}`);
  console.log("==========================================\n");

  await mongoose.disconnect();
}

seed().catch(console.error);
