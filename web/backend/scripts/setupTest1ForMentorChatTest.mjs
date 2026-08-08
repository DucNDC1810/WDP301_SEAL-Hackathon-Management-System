// One-off: chuẩn bị contest "Test1" để test mobile + chat — tạo 1 team demo, thêm tiêu chí
// chấm điểm cho vòng sơ loại (nếu thiếu), kích hoạt vòng sơ loại, và phân công 1 mentor vào team.
// Idempotent: chạy lại an toàn, không tạo trùng team/user.
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import Contest from "../src/models/Contest.js";
import Team from "../src/models/Team.js";
import User from "../src/models/User.js";
import MentorAssignment from "../src/models/MentorAssignment.js";

const CONTEST_ID = "6a7741abb6fc996482cb442e";
const TEAM_NAME = "Test1 Mobile Demo Team";
const MENTOR_EMAIL = "mentor@fpt.edu.vn"; // Dr. Nguyen Van Mentor — mentor có sẵn trong hệ thống

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, { dbName: process.env.DB_DATABASE });
  console.log("✓ Connected to MongoDB");

  const contest = await Contest.findById(CONTEST_ID);
  if (!contest) throw new Error("Không tìm thấy contest Test1");
  console.log(`Contest: "${contest.title}" (status=${contest.status})`);

  // 1. Mở contest nếu đang draft, để team/mentor hoạt động bình thường trên UI
  if (contest.status === "draft") {
    contest.status = "open";
    console.log("→ Chuyển status draft → open");
  }

  // 2. Thêm tiêu chí chấm điểm cho vòng sơ loại nếu đang trống (activateRound yêu cầu weight tổng = 1.0)
  const round1 = contest.rounds.id(contest.rounds.find(r => r.round_number === 1)._id);
  if (!round1.score_criteria || round1.score_criteria.length === 0) {
    round1.score_criteria = [
      { name: "Code Quality", weight: 0.4, max_score: 10, description: "Chất lượng mã nguồn, kiến trúc" },
      { name: "Innovation", weight: 0.3, max_score: 10, description: "Tính sáng tạo, mới mẻ của giải pháp" },
      { name: "Presentation", weight: 0.3, max_score: 10, description: "Chất lượng demo/trình bày" },
    ];
    console.log("→ Đã thêm 3 tiêu chí chấm điểm cho Vòng sơ loại (tổng weight 1.0)");
  }

  await contest.save();

  // 3. Kích hoạt vòng sơ loại nếu chưa active
  const freshContest = await Contest.findById(CONTEST_ID);
  const freshRound1 = freshContest.rounds.find(r => r.round_number === 1);
  if (!freshRound1.is_active) {
    freshRound1.is_active = true;
    await freshContest.save();
    console.log("→ Đã kích hoạt Vòng sơ loại");
  } else {
    console.log("→ Vòng sơ loại đã active sẵn");
  }

  // 4. Tạo team demo (idempotent) với 3 thành viên test
  let team = await Team.findOne({ contest_id: CONTEST_ID, team_name: TEAM_NAME });
  if (!team) {
    const passwordHash = await bcrypt.hash("User@123456", 10);
    const memberSpecs = [
      { full_name: "Nguyễn Văn Leader", email: "test1-leader@demo.seal.local" },
      { full_name: "Trần Thị Member Hai", email: "test1-member2@demo.seal.local" },
      { full_name: "Lê Văn Member Ba", email: "test1-member3@demo.seal.local" },
    ];
    const users = [];
    for (const spec of memberSpecs) {
      let u = await User.findOne({ email: spec.email });
      if (!u) {
        u = await User.create({
          full_name: spec.full_name,
          email: spec.email,
          password_hash: passwordHash,
          provider: "local",
          is_verified: true,
          is_profile_complete: true,
          roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "contestant" }],
        });
        console.log(`→ Đã tạo user ${spec.email}`);
      }
      users.push(u);
    }
    const leader = users[0];
    team = await Team.create({
      contest_id: CONTEST_ID,
      team_name: TEAM_NAME,
      leader_id: leader._id,
      members: users.map((u, idx) => ({
        user_id: u._id,
        email: u.email,
        full_name: u.full_name,
        email_verified: true,
        contribution_percentage: idx === 0 ? 40 : 30,
      })),
      status: "CONFIRMED",
    });
    console.log(`→ Đã tạo team "${team.team_name}" (status CONFIRMED, 3 thành viên)`);
  } else {
    console.log(`→ Team "${TEAM_NAME}" đã tồn tại sẵn`);
  }

  // 5. Phân công mentor vào team (idempotent — bỏ qua nếu đã có assignment active/pending)
  const mentor = await User.findOne({ email: MENTOR_EMAIL });
  if (!mentor) throw new Error(`Không tìm thấy mentor ${MENTOR_EMAIL}`);

  const existingAssignment = await MentorAssignment.findOne({
    contest_id: CONTEST_ID,
    round_id: round1._id,
    team_id: team._id,
  });

  if (existingAssignment) {
    console.log(`→ Team đã có mentor assignment (status=${existingAssignment.status}), bỏ qua bước tạo mới`);
    if (existingAssignment.status !== "accepted") {
      existingAssignment.status = "accepted";
      existingAssignment.responded_at = new Date();
      await existingAssignment.save();
      console.log("→ Đã set assignment sang accepted để hiện ngay trên dashboard mentor/team");
    }
  } else {
    const assignment = await MentorAssignment.create({
      contest_id: CONTEST_ID,
      round_id: round1._id,
      board_id: null,
      team_id: team._id,
      mentor_id: mentor._id,
      mentor_type: "INTERNAL",
      assigned_by: mentor._id, // script chạy ngoài luồng admin thật — dùng chính mentor làm actor cho hợp lệ
      assigned_at: new Date(),
      status: "accepted", // set sẵn accepted để không cần bấm email xác nhận khi demo
      responded_at: new Date(),
    });
    console.log(`→ Đã phân công mentor "${mentor.full_name}" <${mentor.email}> vào team "${team.team_name}" (status accepted)`);
  }

  console.log("\n=== HOÀN TẤT ===");
  console.log(`Contest:  ${contest.title}  (id=${CONTEST_ID})`);
  console.log(`Team:     ${team.team_name}  (id=${team._id})`);
  console.log(`Mentor:   ${mentor.full_name} <${mentor.email}>`);
  console.log(`Vòng:     Vòng sơ loại — đã kích hoạt`);
  console.log(`\nTài khoản team để đăng nhập test mobile/chat:`);
  console.log(`  test1-leader@demo.seal.local / User@123456  (leader)`);
  console.log(`  test1-member2@demo.seal.local / User@123456`);
  console.log(`  test1-member3@demo.seal.local / User@123456`);
  console.log(`\nTài khoản mentor để test chat phía mentor: ${mentor.email} (mật khẩu hiện có sẵn của tài khoản này)`);

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
