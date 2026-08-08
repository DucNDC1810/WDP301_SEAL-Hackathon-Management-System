// Thay vì đổi mật khẩu tài khoản mentor có sẵn (mentor@fpt.edu.vn — không biết mật khẩu gốc),
// tạo 1 tài khoản mentor demo MỚI với mật khẩu biết trước, rồi chuyển assignment đã tạo
// trước đó (script setupTest1ForMentorChatTest.mjs) sang mentor demo này.
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import User from "../src/models/User.js";
import MentorAssignment from "../src/models/MentorAssignment.js";

const CONTEST_ID = "6a7741abb6fc996482cb442e";
const DEMO_MENTOR_EMAIL = "test1-mentor@demo.seal.local";
const DEMO_MENTOR_PASSWORD = "User@123456";

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, { dbName: process.env.DB_DATABASE });
  console.log("✓ Connected to MongoDB");

  let mentor = await User.findOne({ email: DEMO_MENTOR_EMAIL });
  if (!mentor) {
    const password_hash = await bcrypt.hash(DEMO_MENTOR_PASSWORD, 10);
    mentor = await User.create({
      full_name: "Mentor Demo Test1",
      email: DEMO_MENTOR_EMAIL,
      password_hash,
      provider: "local",
      is_verified: true,
      is_profile_complete: true,
      roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "mentor" }],
    });
    console.log(`→ Đã tạo mentor demo mới: ${DEMO_MENTOR_EMAIL} / ${DEMO_MENTOR_PASSWORD}`);
  } else {
    console.log(`→ Mentor demo đã tồn tại sẵn: ${DEMO_MENTOR_EMAIL}`);
  }

  const updated = await MentorAssignment.findOneAndUpdate(
    { contest_id: CONTEST_ID },
    { mentor_id: mentor._id, mentor_type: "INTERNAL", status: "accepted", responded_at: new Date() },
    { new: true }
  ).populate("team_id", "team_name");

  if (updated) {
    console.log(`→ Đã chuyển assignment sang mentor demo cho team "${updated.team_id?.team_name}"`);
  } else {
    console.log("→ Không tìm thấy assignment nào để chuyển — kiểm tra lại script trước đó đã chạy chưa.");
  }

  console.log(`\nĐăng nhập test mentor: ${DEMO_MENTOR_EMAIL} / ${DEMO_MENTOR_PASSWORD}`);
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
