/**
 * Thêm 3 thành viên đã xác thực vào đội "Team Test" đang tồn tại (đủ 4/4).
 * Password của các user mới: User@123456
 *
 * Run: node scripts/addMembersToTeamTest.js
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
const TEAM_NAME = 'Team Test';

const NEW_MEMBERS = [
  { full_name: 'Nguyễn Văn An',   email: 'an.nv@seal.test',   student_id: 'TT001' },
  { full_name: 'Trần Thị Bình',   email: 'binh.tt@seal.test', student_id: 'TT002' },
  { full_name: 'Lê Hoàng Cường',  email: 'cuong.lh@seal.test', student_id: 'TT003' },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log('✓ Kết nối MongoDB thành công\n');

  const team = await Team.findOne({ team_name: TEAM_NAME });
  if (!team) {
    throw new Error(`Không tìm thấy đội "${TEAM_NAME}"`);
  }
  console.log(`📌 Đội hiện tại: ${team.team_name} (${team.members.length} thành viên)`);

  const existingEmails = new Set(team.members.map(m => m.email.toLowerCase()));
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const m of NEW_MEMBERS) {
    if (existingEmails.has(m.email.toLowerCase())) {
      console.log(`   ⚠️  ${m.email} đã có trong đội, bỏ qua.`);
      continue;
    }

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
        profile_verify_note:    'Approved by addMembersToTeamTest script',
        roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: 'contestant' }],
      });
      console.log(`   ✓ Tạo user mới: ${m.email}`);
    } else {
      user.is_verified           = true;
      user.is_profile_complete   = true;
      user.profile_verify_status = 'approved';
      user.profile_verify_note   = 'Approved by addMembersToTeamTest script';
      await user.save();
      console.log(`   ↻ Cập nhật user: ${m.email}`);
    }

    team.members.push({
      user_id:                 user._id,
      email:                   user.email,
      full_name:               user.full_name,
      email_verified:          true,
      contribution_percentage: 20,
    });
    existingEmails.add(m.email.toLowerCase());
    console.log(`   ✅ Thêm ${m.full_name} vào đội`);
  }

  const allVerified = team.members.every(mm => mm.email_verified);
  if (allVerified && team.members.length >= 4 && team.status === 'PENDING_MEMBERS') {
    team.status = 'WAITING_APPROVAL';
  }

  await team.save();

  console.log(`\n🎯 Hoàn tất! Đội "${team.team_name}" hiện có ${team.members.length} thành viên, status: ${team.status}`);
  console.log(`   Mật khẩu tài khoản mới: ${PASSWORD}`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('\n❌ Thất bại:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
