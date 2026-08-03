// Tạo 1 submission demo cho contest "Test" — Vòng chung kết — dùng link GitHub thật
// để admin có thể bấm "Xem số commit" thử trên UI (tab Duyệt Bài Nộp).
import 'dotenv/config';
import mongoose from 'mongoose';
import Contest from '../src/models/Contest.js';
import Team from '../src/models/Team.js';
import Submission from '../src/models/Submission.js';

await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, { dbName: process.env.DB_DATABASE });

const contest = await Contest.findOne({ title: 'Test' });
if (!contest) throw new Error('Contest "Test" not found');

const finalRound = contest.rounds.find(r => r.name === 'Vòng chung kết');
if (!finalRound) throw new Error('Round "Vòng chung kết" not found');

const team = await Team.findOne({ contest_id: contest._id, team_name: 'DEMO Đội Sấm Sét' });
if (!team) throw new Error('Team "DEMO Đội Sấm Sét" not found — chạy seed_test_contest_final_round.mjs trước');

// Idempotent: xóa submission demo cũ của team này trong round này nếu có
await Submission.deleteMany({ team_id: team._id, round_id: finalRound._id });

const submission = await Submission.create({
  repo_url: 'https://github.com/DucNDC1810/WDP301_SEAL-Hackathon-Management-System',
  demo_url: 'https://youtube.com/watch?v=demo',
  slide_url: 'https://docs.google.com/presentation/d/demo-slide',
  team_id: team._id,
  round_id: finalRound._id,
  is_accessible: true,
  status: 'SUBMITTED',
  submitted_at: new Date(),
});

console.log('Đã tạo submission:', submission._id.toString());
console.log('Team:', team.team_name);
console.log('Round:', finalRound.name);
console.log('Repo:', submission.repo_url);

await mongoose.disconnect();
