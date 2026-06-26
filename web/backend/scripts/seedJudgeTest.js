/**
 * Seed script: tạo dữ liệu test đầy đủ cho judge@gmail.com
 * Run: node scripts/seedJudgeTest.js
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ── models ────────────────────────────────────────────────────────────────────
import User             from '../src/models/User.js';
import Contest          from '../src/models/Contest.js';
import Team             from '../src/models/Team.js';
import Pool             from '../src/models/Pool.js';
import Topic            from '../src/models/Topic.js';
import Submission       from '../src/models/Submission.js';
import JudgeAssignment  from '../src/models/JudgeAssignment.js';
import PresentationSlot from '../src/models/PresentationSlot.js';

// ── config ────────────────────────────────────────────────────────────────────
const JUDGE_EMAIL    = 'judge@gmail.com';
const JUDGE_PASSWORD = 'Judge@123456';
const CONTEST_TITLE  = 'SEAL Hackathon 2026 TEST';

// ── data ──────────────────────────────────────────────────────────────────────
const TEAM_DATA = [
  {
    name: 'Pixel Pioneers',
    members: [
      { full_name: 'Nguyễn Hoàng Long', email: 'long.pix@test.com', contribution_percentage: 40 },
      { full_name: 'Trần Bảo Ngọc',     email: 'ngoc.pix@test.com', contribution_percentage: 30 },
      { full_name: 'Lê Quang Huy',      email: 'huy.pix@test.com',  contribution_percentage: 30 },
    ],
  },
  {
    name: 'Null Pointers',
    members: [
      { full_name: 'Phạm Thị Lan',  email: 'lan.np@test.com',  contribution_percentage: 35 },
      { full_name: 'Đỗ Minh Tuấn', email: 'tuan.np@test.com', contribution_percentage: 35 },
      { full_name: 'Vũ Hải Đăng',  email: 'dang.np@test.com', contribution_percentage: 30 },
    ],
  },
  {
    name: 'Stack Overflow',
    members: [
      { full_name: 'Ngô Gia Bảo',     email: 'bao.so@test.com', contribution_percentage: 40 },
      { full_name: 'Đặng Khánh Vy',   email: 'vy.so@test.com',  contribution_percentage: 35 },
      { full_name: 'Hoàng Minh Nam',  email: 'nam.so@test.com', contribution_percentage: 25 },
    ],
  },
  {
    name: 'Async Avengers',
    members: [
      { full_name: 'Trần Quốc Bảo',   email: 'bao.aa@test.com',  contribution_percentage: 35 },
      { full_name: 'Lê Thị Hồng',     email: 'hong.aa@test.com', contribution_percentage: 25 },
      { full_name: 'Phạm Văn Đức',    email: 'duc.aa@test.com',  contribution_percentage: 25 },
      { full_name: 'Nguyễn Mai Anh',  email: 'anh.aa@test.com',  contribution_percentage: 15 },
    ],
  },
  {
    name: 'Quantum Quokkas',
    members: [
      { full_name: 'Lý Tưởng Vy',  email: 'vy.qq@test.com',  contribution_percentage: 50 },
      { full_name: 'Cao Đức Anh',  email: 'anh.qq@test.com', contribution_percentage: 50 },
    ],
  },
  {
    name: 'Recursive Rebels',
    members: [
      { full_name: 'Trịnh Văn Hùng',  email: 'hung.rr@test.com',  contribution_percentage: 40 },
      { full_name: 'Mai Thị Phương',  email: 'phuong.rr@test.com', contribution_percentage: 30 },
      { full_name: 'Tạ Quốc Khánh',  email: 'khanh.rr@test.com',  contribution_percentage: 30 },
    ],
  },
  {
    name: 'Binary Bandits',
    members: [
      { full_name: 'Đinh Gia Hân',   email: 'han.bb@test.com',  contribution_percentage: 34 },
      { full_name: 'Lương Bảo Châu', email: 'chau.bb@test.com', contribution_percentage: 33 },
      { full_name: 'Hồ Anh Khoa',   email: 'khoa.bb@test.com', contribution_percentage: 33 },
    ],
  },
  {
    name: 'Logic Legends',
    members: [
      { full_name: 'Bùi Thanh Tùng',  email: 'tung.ll@test.com', contribution_percentage: 45 },
      { full_name: 'Ngô Thị Mỹ Linh', email: 'linh.ll@test.com', contribution_percentage: 30 },
      { full_name: 'Lê Minh Nhật',    email: 'nhat.ll@test.com', contribution_percentage: 25 },
    ],
  },
  {
    name: 'Runtime Rockets',
    members: [
      { full_name: 'Phan Thị Thu Hà',  email: 'ha.rt@test.com',  contribution_percentage: 40 },
      { full_name: 'Dương Văn Kiên',   email: 'kien.rt@test.com', contribution_percentage: 35 },
      { full_name: 'Võ Minh Khải',    email: 'khai.rt@test.com', contribution_percentage: 25 },
    ],
  },
  {
    name: 'Syntax Sorcerers',
    members: [
      { full_name: 'Trương Thị Linh',  email: 'linh.ss@test.com',  contribution_percentage: 40 },
      { full_name: 'Huỳnh Bảo Long',  email: 'long.ss@test.com',  contribution_percentage: 30 },
      { full_name: 'Đinh Vân Anh',    email: 'vanh.ss@test.com',  contribution_percentage: 30 },
    ],
  },
  {
    name: 'Debug Dragons',
    members: [
      { full_name: 'Đoàn Minh Hải',    email: 'hai.dd@test.com', contribution_percentage: 35 },
      { full_name: 'Nguyễn Thị Kim Ngân', email: 'ngan.dd@test.com', contribution_percentage: 35 },
      { full_name: 'Vũ Quang Minh',    email: 'minh.dd@test.com', contribution_percentage: 30 },
    ],
  },
  {
    name: 'Merge Masters',
    members: [
      { full_name: 'Lê Đức Thắng', email: 'thang.mm@test.com', contribution_percentage: 50 },
      { full_name: 'Bùi Thị Xuân', email: 'xuan.mm@test.com',  contribution_percentage: 50 },
    ],
  },
];

const TOPICS = [
  { title: 'EcoTrack — Theo dõi dấu chân carbon cá nhân',        difficulty: 'medium', description: 'Ứng dụng đo và gợi ý giảm phát thải carbon trong sinh hoạt hằng ngày.' },
  { title: 'MediQueue — Quản lý hàng đợi phòng khám realtime',   difficulty: 'easy',   description: 'Hệ thống xếp số và thông báo lượt khám giúp giảm thời gian chờ.' },
  { title: 'CodeMentor AI — Trợ lý review code cho sinh viên',   difficulty: 'hard',   description: 'Phân tích PR và đưa gợi ý cải thiện dựa trên mô hình ngôn ngữ.' },
  { title: 'DevSync — Review code cộng tác thời gian thực',      difficulty: 'medium', description: 'Nền tảng review code trực tiếp nhiều người với con trỏ chung và bình luận inline.' },
  { title: 'SkillSwap — Sàn trao đổi kỹ năng ngang hàng',       difficulty: 'easy',   description: 'Kết nối người học và người dạy theo mô hình đổi kỹ năng lấy kỹ năng.' },
  { title: 'FarmLink — Kết nối nông dân và người mua',           difficulty: 'medium', description: 'Chợ nông sản sơ rút ngắn chuỗi cung ứng từ vườn tới bàn ăn.' },
  { title: 'StudyFlow — Lập kế hoạch ôn thi bằng AI',           difficulty: 'hard',   description: 'Sinh lộ trình ôn tập cá nhân hoá dựa trên điểm yếu của người học.' },
  { title: 'WasteWise — Phân loại rác thông minh bằng camera',   difficulty: 'medium', description: 'Nhận diện hình ảnh phân loại rác tự động, hướng dẫn người dùng tái chế.' },
  { title: 'TutorMatch — Ghép đôi gia sư và học sinh bằng AI',  difficulty: 'easy',   description: 'Thuật toán ghép đôi dựa trên phong cách học và sở trường giảng dạy.' },
  { title: 'HealthBuddy — Theo dõi sức khoẻ gia đình',          difficulty: 'medium', description: 'Dashboard sức khoẻ gia đình với nhắc nhở uống thuốc và lịch tái khám.' },
  { title: 'SafeRoute — Bản đồ đường đi an toàn ban đêm',        difficulty: 'hard',   description: 'Gợi ý tuyến đường dựa trên dữ liệu tội phạm và độ sáng đèn đường.' },
  { title: 'GreenMarket — Chợ sản phẩm xanh địa phương',        difficulty: 'easy',   description: 'Marketplace kết nối nhà sản xuất xanh với người tiêu dùng tại địa phương.' },
];

const ROOMS = ['Phòng A1', 'Phòng A1', 'Phòng A1', 'Phòng A1',
               'Phòng B1', 'Phòng B1', 'Phòng B1', 'Phòng B1',
               'Phòng A2', 'Phòng A2', 'Phòng B2', 'Phòng B2'];

// ── seed ──────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log('✓ Connected to MongoDB\n');

  // 1. Judge user ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(JUDGE_PASSWORD, 10);
  let judge = await User.findOne({ email: JUDGE_EMAIL });
  if (!judge) {
    judge = await User.create({
      full_name: 'My Judge',
      email:     JUDGE_EMAIL,
      password_hash: passwordHash,
      provider:  'local',
      is_verified: true,
      is_profile_complete: true,
      roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: 'judge' }],
    });
    console.log('✓ Tạo judge user:', JUDGE_EMAIL);
  } else {
    judge.password_hash = passwordHash;
    if (!judge.roles.some(r => r.role_name === 'judge')) {
      judge.roles.push({ role_id: new mongoose.Types.ObjectId(), role_name: 'judge' });
    }
    judge.is_verified = true;
    await judge.save();
    console.log('✓ Judge đã tồn tại, cập nhật password + role:', JUDGE_EMAIL);
  }

  // 2. Dọn dữ liệu cũ ─────────────────────────────────────────────────────────
  const oldContest = await Contest.findOne({ title: CONTEST_TITLE });
  if (oldContest) {
    const oldTeams = await Team.find({ contest_id: oldContest._id });
    const oldTeamIds = oldTeams.map(t => t._id);

    await PresentationSlot.deleteMany({ contest_id: oldContest._id });
    await JudgeAssignment.deleteMany({ contest_id: oldContest._id });
    await Submission.deleteMany({ team_id: { $in: oldTeamIds } });
    await Pool.deleteMany({ contest_id: oldContest._id });
    await Team.deleteMany({ contest_id: oldContest._id });
    await Topic.deleteMany({ contest_id: oldContest._id });
    await Contest.deleteOne({ _id: oldContest._id });
    console.log('✓ Dọn sạch dữ liệu contest cũ\n');
  }

  // 3. Contest với Round 1 active ──────────────────────────────────────────────
  const now       = new Date();
  const roundStart = new Date(now.getTime() - 8 * 3600_000);  // 8 tiếng trước
  const roundEnd   = new Date(now.getTime() + 4 * 3600_000);  // 4 tiếng nữa

  const contest = await Contest.create({
    title: CONTEST_TITLE,
    description: 'Contest dùng để test trang JudgeScoringPage — dữ liệu đầy đủ cho judge@gmail.com',
    start_date:            new Date(now.getTime() - 2 * 24 * 3600_000),
    end_date:              new Date(now.getTime() + 5 * 24 * 3600_000),
    registration_deadline: new Date(now.getTime() - 3 * 24 * 3600_000),
    status: 'open',
    max_teams_per_pool: 15,
    rounds: [{
      round_number: 1,
      name: 'Vòng sơ loại',
      start_time:  roundStart,
      end_time:    roundEnd,
      submission_deadline: roundEnd,
      is_active: true,
      scoring_locked: false,
      score_criteria: [
        { name: 'Criterion A', max_score: 10, weight: 0.4, description: 'Tính sáng tạo và đổi mới — ý tưởng độc đáo, giải quyết vấn đề thực tế theo cách mới mẻ.' },
        { name: 'Criterion B', max_score: 10, weight: 0.3, description: 'Chất lượng kỹ thuật — kiến trúc, độ ổn định, chất lượng code và khả năng xử lý lỗi.' },
        { name: 'Criterion C', max_score: 10, weight: 0.3, description: 'Trải nghiệm người dùng và demo — giao diện trực quan, luồng mượt mà, demo thuyết phục.' },
      ],
    }],
  });

  const round   = contest.rounds[0];
  const roundId = round._id;
  console.log('✓ Tạo contest:', contest.title);
  console.log('  Contest ID :', contest._id.toString());
  console.log('  Round ID   :', roundId.toString());

  // 4. Topics ──────────────────────────────────────────────────────────────────
  const topics = await Topic.insertMany(
    TOPICS.map(t => ({ ...t, contest_id: contest._id, status: 'active' }))
  );
  console.log(`✓ Tạo ${topics.length} topics`);

  // 5. Leader users + Teams ────────────────────────────────────────────────────
  const teams = [];
  for (let i = 0; i < TEAM_DATA.length; i++) {
    const td = TEAM_DATA[i];
    const leaderData = td.members[0];

    let leader = await User.findOne({ email: leaderData.email });
    if (!leader) {
      leader = await User.create({
        full_name:  leaderData.full_name,
        email:      leaderData.email,
        password_hash: await bcrypt.hash('Test@123456', 10),
        provider:   'local',
        is_verified: true,
        is_profile_complete: true,
        roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: 'contestant' }],
      });
    }

    const membersPayload = td.members.map((m, j) => ({
      user_id:                j === 0 ? leader._id : new mongoose.Types.ObjectId(),
      email:                  m.email,
      full_name:              m.full_name,
      email_verified:         true,
      contribution_percentage: m.contribution_percentage,
    }));

    const team = await Team.create({
      contest_id: contest._id,
      team_name:  td.name,
      leader_id:  leader._id,
      members:    membersPayload,
      status:     'CONFIRMED',
      topic_id:   topics[i]._id,
    });
    teams.push(team);
  }
  console.log(`✓ Tạo ${teams.length} teams`);

  // 6. Pool ────────────────────────────────────────────────────────────────────
  const pool = await Pool.create({
    contest_id: contest._id,
    round_id:   roundId,
    pool_name:  'Bảng A',
    description: 'Pool test cho judge@gmail.com',
    teams: teams.map(t => t._id),
  });
  await Team.updateMany({ _id: { $in: teams.map(t => t._id) } }, { pool_id: pool._id });
  console.log('✓ Tạo pool:', pool.pool_name, '| Pool ID:', pool._id.toString());

  // 7. Judge Assignment ────────────────────────────────────────────────────────
  await JudgeAssignment.create({
    contest_id:        contest._id,
    round_id:          roundId,
    pool_id:           pool._id,
    judge_id:          judge._id,
    judge_type:        'INTERNAL',
    invitation_status: 'active',
    assigned_by:       judge._id,
    assigned_at:       new Date(),
  });
  console.log('✓ Tạo judge assignment →', JUDGE_EMAIL);

  // 8. Submissions ─────────────────────────────────────────────────────────────
  for (const team of teams) {
    const slug = team.team_name.toLowerCase().replace(/\s+/g, '-');
    await Submission.create({
      team_id:    team._id,
      round_id:   roundId,
      repo_url:   `https://github.com/seal2026/${slug}`,
      slide_url:  `https://docs.google.com/presentation/d/seal-${slug}`,
      demo_url:   `https://${slug}.vercel.app`,
      status:     'SUBMITTED',
      submitted_at: new Date(now.getTime() - 2 * 3600_000),
      is_accessible: true,
    });
  }
  console.log(`✓ Tạo ${teams.length} submissions (repo + slide + demo)`);

  // 9. Presentation Slots ──────────────────────────────────────────────────────
  // Bắt đầu từ 7 tiếng trước, mỗi slot 25 phút, nghỉ 5 phút
  const slotBase = new Date(now.getTime() - 7 * 3600_000);
  for (let i = 0; i < teams.length; i++) {
    const start = new Date(slotBase.getTime() + i * 30 * 60_000);
    const end   = new Date(start.getTime() + 25 * 60_000);
    await PresentationSlot.create({
      contest_id:     contest._id,
      round_id:       roundId,
      pool_id:        pool._id,
      start_time:     start,
      end_time:       end,
      room:           ROOMS[i],
      booked_team_id: teams[i]._id,
      booked_at:      new Date(),
      status:         'booked',
    });
  }
  console.log(`✓ Tạo ${teams.length} presentation slots (tất cả đã unlock)\n`);

  // 10. Done ───────────────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════');
  console.log('  🎯  SEED HOÀN TẤT');
  console.log('══════════════════════════════════════════════════');
  console.log('  Email   :', JUDGE_EMAIL);
  console.log('  Password:', JUDGE_PASSWORD);
  console.log('──────────────────────────────────────────────────');
  console.log('  Sau khi login → /judge/dashboard');
  console.log('  Hoặc vào thẳng:');
  console.log(`  /judge/scoring/${contest._id}/rounds/${roundId}/pools/${pool._id}`);
  console.log('══════════════════════════════════════════════════');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('\n❌ Seed thất bại:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
