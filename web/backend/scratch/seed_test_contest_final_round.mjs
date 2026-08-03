// Seed demo data cho contest "Test" — Vòng chung kết — để test UI ranking/export Excel.
// Tạo: 4 team (leader + 3 members mỗi team), 3 tiêu chí chấm điểm, gán 2 judge có sẵn,
// mỗi judge chấm đủ 4 team, rồi tính rankings.
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Contest from '../src/models/Contest.js';
import Team from '../src/models/Team.js';
import User from '../src/models/User.js';
import JudgeAssignment from '../src/models/JudgeAssignment.js';
import Score from '../src/models/Score.js';
import ScoreDetail from '../src/models/ScoreDetail.js';
import { calculateRankings } from '../src/services/rankingService.js';

await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, { dbName: process.env.DB_DATABASE });

const contest = await Contest.findOne({ title: 'Test' });
if (!contest) throw new Error('Contest "Test" not found');

const finalRound = contest.rounds.find(r => r.name === 'Vòng chung kết');
if (!finalRound) throw new Error('Round "Vòng chung kết" not found');

console.log('Contest:', contest._id.toString(), '| Round:', finalRound._id.toString());

// 1. Thêm tiêu chí chấm điểm cho vòng chung kết nếu chưa có
if (!finalRound.score_criteria || finalRound.score_criteria.length === 0) {
  finalRound.score_criteria = [
    { name: 'Code Quality', weight: 0.4, max_score: 10, description: 'Chất lượng mã nguồn' },
    { name: 'Innovation', weight: 0.35, max_score: 10, description: 'Tính sáng tạo' },
    { name: 'Presentation', weight: 0.25, max_score: 10, description: 'Thuyết trình' },
  ];
  await contest.save();
  console.log('Đã thêm 3 tiêu chí cho Vòng chung kết');
} else {
  console.log('Round đã có sẵn', finalRound.score_criteria.length, 'tiêu chí, giữ nguyên');
}
const criteria = contest.rounds.id(finalRound._id).score_criteria;

// 2. Tạo 4 team demo, mỗi team có leader + 3 members (tài khoản mới)
const teamDefs = [
  { name: 'DEMO Đội Sấm Sét', slug: 'demo-team-thunder' },
  { name: 'DEMO Đội Bão Tố', slug: 'demo-team-storm' },
  { name: 'DEMO Đội Ánh Sáng', slug: 'demo-team-light' },
  { name: 'DEMO Đội Hỏa Long', slug: 'demo-team-fire' },
];

const passwordHash = await bcrypt.hash('Demo@123456', 10);
const createdTeams = [];

for (const def of teamDefs) {
  // Xóa team demo cùng tên nếu đã tồn tại từ lần chạy trước (idempotent)
  await Team.deleteMany({ team_name: def.name, contest_id: contest._id });

  const memberUsers = [];
  for (let i = 1; i <= 4; i++) {
    const email = `${def.slug}.m${i}@demo.seal.local`;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        full_name: `${def.name} - Thành viên ${i}`,
        email,
        password_hash: passwordHash,
        provider: 'local',
        is_verified: true,
        profile_verify_status: 'approved',
        roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: 'contestant' }],
      });
    }
    memberUsers.push(user);
  }

  const [leader, ...members] = memberUsers;
  const team = await Team.create({
    contest_id: contest._id,
    team_name: def.name,
    leader_id: leader._id,
    status: 'CONFIRMED',
    members: memberUsers.map((u, idx) => ({
      user_id: u._id,
      email: u.email,
      full_name: u.full_name,
      email_verified: true,
      role: idx === 0 ? 'leader' : 'member',
    })),
  });
  createdTeams.push(team);
  console.log('Đã tạo team:', team.team_name, team._id.toString());
}

// 3. Gán 2 judge có sẵn vào vòng chung kết (round-level, không chia pool)
const judges = await User.find({ 'roles.role_name': 'judge' }).limit(2);
if (judges.length === 0) throw new Error('Không tìm thấy judge nào trong hệ thống');

for (const judge of judges) {
  await JudgeAssignment.deleteMany({ judge_id: judge._id, round_id: finalRound._id, contest_id: contest._id });
  await JudgeAssignment.create({
    contest_id: contest._id,
    round_id: finalRound._id,
    pool_id: null,
    judge_id: judge._id,
    judge_type: 'INTERNAL',
    invitation_status: 'active',
  });
  console.log('Đã gán judge:', judge.full_name);
}

// 4. Mỗi judge chấm đủ 4 team với điểm khác nhau (để có thứ hạng rõ ràng)
const baseScoresByTeam = [
  { CodeQuality: 9.0, Innovation: 8.5, Presentation: 9.2 }, // team 0 - cao nhất
  { CodeQuality: 8.0, Innovation: 7.8, Presentation: 8.3 }, // team 1
  { CodeQuality: 7.0, Innovation: 7.5, Presentation: 6.8 }, // team 2
  { CodeQuality: 6.2, Innovation: 6.0, Presentation: 6.5 }, // team 3 - thấp nhất
];

await Score.deleteMany({ contest_id: contest._id, round_id: finalRound._id });
await ScoreDetail.deleteMany({ score_id: { $in: await Score.find({ contest_id: contest._id, round_id: finalRound._id }).distinct('_id') } });

for (const judge of judges) {
  for (let i = 0; i < createdTeams.length; i++) {
    const team = createdTeams[i];
    const base = baseScoresByTeam[i];
    // Dao động nhẹ +-0.3 giữa các judge để dữ liệu tự nhiên hơn
    const jitter = () => Math.round((Math.random() * 0.6 - 0.3) * 10) / 10;

    const criteriaScores = criteria.map(c => {
      const key = c.name.replace(/\s/g, '');
      const value = Math.max(0, Math.min(c.max_score, (base[key] ?? 7.5) + jitter()));
      return { criteria_name: c.name, weight: c.weight, score: Math.round(value * 10) / 10 };
    });
    const weightedAvg = criteriaScores.reduce((sum, c) => sum + c.score * c.weight, 0);

    const score = await Score.create({
      team_id: team._id,
      judge_id: judge._id,
      mentor_id: judge._id,
      contest_id: contest._id,
      round_id: finalRound._id,
      criteria_scores: criteriaScores,
      total_score: Math.round(weightedAvg * 100) / 100,
      weighted_avg_score: Math.round(weightedAvg * 100) / 100,
      comment: 'Điểm demo — dữ liệu seed để test UI',
      score_type: 'NORMAL',
      status: 'submitted',
      is_final: true,
      submitted_at: new Date(),
    });

    await ScoreDetail.insertMany(
      criteriaScores.map(c => ({
        score_id: score._id,
        criteria_name: c.criteria_name,
        score_value: c.score,
        weight: c.weight,
        max_score: criteria.find(cr => cr.name === c.criteria_name)?.max_score || 10,
      }))
    );
  }
  console.log('Judge', judge.full_name, 'đã chấm đủ', createdTeams.length, 'team');
}

// 5. Đánh dấu khóa chấm điểm cho vòng (để UI hiển thị đã công bố) và tính ranking
contest.rounds.id(finalRound._id).scoring_locked = true;
await contest.save();

const rankings = await calculateRankings(contest._id.toString(), finalRound._id.toString());
console.log('\nRankings:');
rankings.forEach(r => console.log(` #${r.rank_position} ${r.team_name} — ${r.final_score}`));

await mongoose.disconnect();
console.log('\nHoàn tất seed dữ liệu demo.');
