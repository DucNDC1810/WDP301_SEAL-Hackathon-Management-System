/**
 * Seed script: Tạo 4 đội thi, mỗi đội có 4 thành viên đã được xác thực.
 * Các đội ở trạng thái ACTIVE (chưa đăng ký contest) để có thể test đăng ký.
 *
 * Run: node scripts/seedFourTeams.js
 * Password của tất cả user: User@123456
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Team from '../src/models/Team.js';

const PASSWORD = 'User@123456';

const TEAMS = [
  {
    team_name: 'Thunder Coders',
    members: [
      { full_name: 'Lê Văn Khoa',     email: 'khoa.lv@seal.test',   student_id: 'TC001' },
      { full_name: 'Nguyễn Thị Hà',   email: 'ha.nt@seal.test',     student_id: 'TC002' },
      { full_name: 'Trần Quốc Huy',   email: 'huy.tq@seal.test',    student_id: 'TC003' },
      { full_name: 'Phạm Ngọc Linh',  email: 'linh.pn@seal.test',   student_id: 'TC004' },
    ],
  },
  {
    team_name: 'Pixel Storm',
    members: [
      { full_name: 'Đỗ Minh Quân',    email: 'quan.dm@seal.test',   student_id: 'PS001' },
      { full_name: 'Vũ Thị Mai',      email: 'mai.vt@seal.test',    student_id: 'PS002' },
      { full_name: 'Hoàng Đức Long',  email: 'long.hd@seal.test',   student_id: 'PS003' },
      { full_name: 'Bùi Khánh Linh',  email: 'linh.bk@seal.test',   student_id: 'PS004' },
    ],
  },
  {
    team_name: 'Code Surge',
    members: [
      { full_name: 'Ngô Thành Đạt',   email: 'dat.nt2@seal.test',   student_id: 'CS001' },
      { full_name: 'Phan Thị Yến',    email: 'yen.pt@seal.test',    student_id: 'CS002' },
      { full_name: 'Đinh Văn Phong',  email: 'phong.dv@seal.test',  student_id: 'CS003' },
      { full_name: 'Lý Hải Anh',      email: 'anh.lh@seal.test',    student_id: 'CS004' },
    ],
  },
  {
    team_name: 'Nano Hackers',
    members: [
      { full_name: 'Đặng Tuấn Kiệt',  email: 'kiet.dt@seal.test',   student_id: 'NH001' },
      { full_name: 'Trịnh Thị Ngọc',  email: 'ngoc.tt@seal.test',   student_id: 'NH002' },
      { full_name: 'Cao Văn Bình',     email: 'binh.cv@seal.test',   student_id: 'NH003' },
      { full_name: 'Hồ Thị Thu',       email: 'thu.ht@seal.test',    student_id: 'NH004' },
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log('✓ Kết nối MongoDB thành công\n');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const spec of TEAMS) {
    console.log(`\n📌 Đang tạo đội: ${spec.team_name}`);

    // Tạo hoặc cập nhật từng user thành viên
    const userDocs = [];
    for (const m of spec.members) {
      let user = await User.findOne({ email: m.email });
      if (!user) {
        user = await User.create({
          full_name:              m.full_name,
          email:                  m.email,
          password_hash:          passwordHash,
          provider:               'local',
          is_verified:            true,
          is_profile_complete:    true,
          phone:                  '090' + Math.floor(Math.random() * 9000000 + 1000000),
          student_id:             m.student_id,
          student_card:           'https://placehold.co/400x250?text=Student+Card',
          profile_verify_status:  'approved',
          profile_verify_note:    'Approved by seed script',
          roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: 'contestant' }],
        });
        console.log(`   ✓ Tạo user mới: ${m.email}`);
      } else {
        // Cập nhật thông tin xác thực
        user.is_verified           = true;
        user.is_profile_complete   = true;
        user.profile_verify_status = 'approved';
        user.profile_verify_note   = 'Approved by seed script';
        user.password_hash         = passwordHash;
        if (!user.student_id) user.student_id = m.student_id;
        await user.save();
        console.log(`   ↻ Cập nhật user: ${m.email}`);
      }
      userDocs.push(user);
    }

    // Kiểm tra đội đã tồn tại chưa
    const existing = await Team.findOne({ team_name: spec.team_name });
    if (existing) {
      console.log(`   ⚠️  Đội "${spec.team_name}" đã tồn tại. Bỏ qua.`);
      continue;
    }

    // Tạo đội (trạng thái ACTIVE, chưa đăng ký contest)
    const leader = userDocs[0];
    const membersPayload = userDocs.map((u, idx) => ({
      user_id:                 u._id,
      email:                   u.email,
      full_name:               u.full_name,
      email_verified:          true,
      contribution_percentage: idx === 0 ? 40 : 20,
    }));

    const team = await Team.create({
      team_name:  spec.team_name,
      leader_id:  leader._id,
      members:    membersPayload,
      status:     'ACTIVE',
      contest_id: null,
    });

    console.log(`   ✅ Tạo đội thành công! ID: ${team._id}`);
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('  🎯  SEED HOÀN TẤT');
  console.log('══════════════════════════════════════════════════');
  console.log('  Mật khẩu tất cả tài khoản: ' + PASSWORD);
  console.log('\n  Tài khoản trưởng nhóm (có thể đăng nhập test):');
  for (const spec of TEAMS) {
    console.log(`    • ${spec.team_name}: ${spec.members[0].email}`);
  }
  console.log('══════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('\n❌ Seed thất bại:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
