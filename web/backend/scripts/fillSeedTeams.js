/**
 * Đảm bảo 4 đội gắn với seedteam1-4.member1@test.com đều có đủ 4/4 thành viên đã xác thực.
 * - seedteam1.member1@test.com: leader sẵn có của "Team Alpha" -> bổ sung thêm 3 thành viên.
 * - seedteam2/3/4.member1@test.com: chưa dẫn dắt đội nào -> tạo đội mới rồi bổ sung 3 thành viên.
 *
 * Password của các user mới tạo: User@123456
 *
 * Run: node scripts/fillSeedTeams.js
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

const SPECS = [
  {
    leaderEmail: 'seedteam1.member1@test.com',
    teamName: 'Team Alpha',
    createTeamIfMissing: false,
    newMembers: [
      { full_name: 'Seed Team1 Member2', email: 'seedteam1.member2@test.com', student_id: 'ST1002' },
      { full_name: 'Seed Team1 Member3', email: 'seedteam1.member3@test.com', student_id: 'ST1003' },
      { full_name: 'Seed Team1 Member4', email: 'seedteam1.member4@test.com', student_id: 'ST1004' },
    ],
  },
  {
    leaderEmail: 'seedteam2.member1@test.com',
    teamName: 'Team Beta (Seed)',
    createTeamIfMissing: true,
    newMembers: [
      { full_name: 'Seed Team2 Member2', email: 'seedteam2.member2@test.com', student_id: 'ST2002' },
      { full_name: 'Seed Team2 Member3', email: 'seedteam2.member3@test.com', student_id: 'ST2003' },
      { full_name: 'Seed Team2 Member4', email: 'seedteam2.member4@test.com', student_id: 'ST2004' },
    ],
  },
  {
    leaderEmail: 'seedteam3.member1@test.com',
    teamName: 'Team Gamma (Seed)',
    createTeamIfMissing: true,
    newMembers: [
      { full_name: 'Seed Team3 Member2', email: 'seedteam3.member2@test.com', student_id: 'ST3002' },
      { full_name: 'Seed Team3 Member3', email: 'seedteam3.member3@test.com', student_id: 'ST3003' },
      { full_name: 'Seed Team3 Member4', email: 'seedteam3.member4@test.com', student_id: 'ST3004' },
    ],
  },
  {
    leaderEmail: 'seedteam4.member1@test.com',
    teamName: 'Team Delta (Seed)',
    createTeamIfMissing: true,
    newMembers: [
      { full_name: 'Seed Team4 Member2', email: 'seedteam4.member2@test.com', student_id: 'ST4002' },
      { full_name: 'Seed Team4 Member3', email: 'seedteam4.member3@test.com', student_id: 'ST4003' },
      { full_name: 'Seed Team4 Member4', email: 'seedteam4.member4@test.com', student_id: 'ST4004' },
    ],
  },
];

async function ensureVerifiedUser(m, passwordHash) {
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
      profile_verify_note:    'Approved by fillSeedTeams script',
      roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: 'contestant' }],
    });
    console.log(`   ✓ Tạo user mới: ${m.email}`);
  } else {
    user.is_verified           = true;
    user.is_profile_complete   = true;
    user.profile_verify_status = 'approved';
    user.profile_verify_note   = 'Approved by fillSeedTeams script';
    await user.save();
    console.log(`   ↻ Cập nhật user: ${m.email}`);
  }
  return user;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log('✓ Kết nối MongoDB thành công\n');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const spec of SPECS) {
    console.log(`\n📌 Xử lý: ${spec.leaderEmail}`);

    const leaderUser = await User.findOne({ email: spec.leaderEmail });
    if (!leaderUser) {
      console.log(`   ⚠️  Không tìm thấy user ${spec.leaderEmail}, bỏ qua.`);
      continue;
    }

    let team = await Team.findOne({ leader_id: leaderUser._id });
    if (!team) {
      if (!spec.createTeamIfMissing) {
        console.log(`   ⚠️  Không tìm thấy đội do ${spec.leaderEmail} dẫn dắt, bỏ qua.`);
        continue;
      }
      team = await Team.create({
        team_name: spec.teamName,
        leader_id: leaderUser._id,
        members: [{
          user_id:                 leaderUser._id,
          email:                   leaderUser.email,
          full_name:               leaderUser.full_name,
          email_verified:          true,
          contribution_percentage: 40,
          role:                    'leader',
        }],
        status:     'ACTIVE',
        contest_id: null,
      });
      console.log(`   ✅ Tạo đội mới: ${team.team_name}`);
    } else {
      console.log(`   Đội hiện tại: ${team.team_name} (${team.members.length} thành viên)`);
    }

    const existingEmails = new Set(team.members.map(m => m.email.toLowerCase()));

    for (const m of spec.newMembers) {
      if (team.members.length >= 4) break;
      if (existingEmails.has(m.email.toLowerCase())) {
        console.log(`   ⚠️  ${m.email} đã có trong đội, bỏ qua.`);
        continue;
      }
      const user = await ensureVerifiedUser(m, passwordHash);
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

    if (team.members.length >= 4 && team.members.every(mm => mm.email_verified) && team.status === 'PENDING_MEMBERS') {
      team.status = 'WAITING_APPROVAL';
    }

    await team.save();
    console.log(`   🎯 "${team.team_name}" hiện có ${team.members.length} thành viên, status: ${team.status}`);
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('  HOÀN TẤT — mật khẩu user mới tạo: ' + PASSWORD);
  console.log('══════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('\n❌ Thất bại:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
