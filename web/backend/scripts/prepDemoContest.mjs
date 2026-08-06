// Prep data demo "one-click": tạo 1 cuộc thi hoàn chỉnh sẵn sàng cho demo/bảo vệ đồ án —
// đầy đủ ngày tháng (mở/đóng đăng ký, khai mạc, kết thúc), 2 vòng thi (sơ loại + chung kết)
// kèm tiêu chí chấm điểm, đúng theo toàn bộ các ràng buộc hệ thống hiện tại
// (min/max_team_size, kickoff_date lưu thật trong DB, mô hình "2 ngày: khai mạc + thi").
//
// Chạy lại nhiều lần an toàn: tự xóa contest demo cũ cùng tên trước khi tạo lại.
//
// Cách chạy: cd web/backend && node scripts/prepDemoContest.mjs
import "dotenv/config";
import mongoose from "mongoose";
import Contest from "../src/models/Contest.js";
import User from "../src/models/User.js";

const CONTEST_TITLE = "DEMO SEAL Hackathon";

await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, { dbName: process.env.DB_DATABASE });

const admin = await User.findOne({ "roles.role_name": "admin" }).select("_id email");
if (!admin) {
  console.error("Không tìm thấy tài khoản admin nào trong hệ thống — hãy tạo 1 admin trước khi chạy script này.");
  process.exit(1);
}

// Xóa contest demo cũ cùng tên nếu có (idempotent — chạy lại nhiều lần an toàn)
await Contest.deleteMany({ title: CONTEST_TITLE });

const now = new Date();
const addHours = (d, h) => new Date(d.getTime() + h * 60 * 60 * 1000);
const addDays = (d, days) => addHours(d, days * 24);

// Timeline: mở đăng ký ngay bây giờ → đóng đăng ký sau 1 ngày → khai mạc sau đó 12h →
// thi trong ngày khai mạc → kết thúc cuộc thi vào hôm sau (đúng mô hình "2 ngày").
const registrationOpenDate = now;
const registrationDeadline = addDays(now, 1);
const kickoffDate = addHours(registrationDeadline, 12);
const startDate = kickoffDate; // ngày khai mạc = ngày bắt đầu thi
const endDate = addDays(startDate, 1); // ngày kết thúc = hôm sau

// 2 round diễn ra trong cùng ngày thi: sơ loại buổi sáng, chung kết buổi chiều nối tiếp.
const round1Deadline = addHours(startDate, 4);
const round2Deadline = addHours(round1Deadline, 4);

const contest = await Contest.create({
  title: CONTEST_TITLE,
  description: "Cuộc thi demo — dữ liệu chuẩn bị sẵn để test/trình diễn toàn bộ luồng nghiệp vụ.",
  start_date: startDate,
  end_date: endDate,
  registration_deadline: registrationDeadline,
  kickoff_date: kickoffDate,
  status: "open",
  auto_close: false,
  created_by: admin._id,
  max_teams_per_pool: 10,
  min_team_size: 3,
  max_team_size: 5,
  wildcard_enabled: true,
  individual_ranking_enabled: false,
  rounds: [
    {
      round_number: 1,
      name: "Vòng sơ loại",
      start_time: startDate,
      end_time: round1Deadline,
      submission_deadline: round1Deadline,
      is_active: false,
      scoring_locked: false,
      coding_duration_hours: 4,
      top_n_advance: 6,
      wildcard_enabled: true,
      score_criteria: [
        { name: "Code Quality", weight: 0.4, max_score: 10, description: "Chất lượng mã nguồn, kiến trúc" },
        { name: "Innovation", weight: 0.3, max_score: 10, description: "Tính sáng tạo, mới mẻ của giải pháp" },
        { name: "Presentation", weight: 0.3, max_score: 10, description: "Chất lượng demo/trình bày" },
      ],
    },
    {
      round_number: 2,
      name: "Vòng chung kết",
      start_time: round1Deadline,
      end_time: round2Deadline,
      submission_deadline: round2Deadline,
      is_active: false,
      scoring_locked: false,
      coding_duration_hours: 4,
      top_n_advance: 3,
      wildcard_enabled: false,
      score_criteria: [
        { name: "Code Quality", weight: 0.35, max_score: 10, description: "Chất lượng mã nguồn, kiến trúc" },
        { name: "Innovation", weight: 0.35, max_score: 10, description: "Tính sáng tạo, mới mẻ của giải pháp" },
        { name: "Presentation", weight: 0.3, max_score: 10, description: "Chất lượng demo/trình bày trước BGK" },
      ],
    },
  ],
});

console.log("Đã tạo cuộc thi demo thành công!\n");
console.log("Contest ID:      ", contest._id.toString());
console.log("Tên cuộc thi:    ", contest.title);
console.log("Trạng thái:      ", contest.status);
console.log("Mở đăng ký:      ", registrationOpenDate.toLocaleString("vi-VN"));
console.log("Đóng đăng ký:    ", registrationDeadline.toLocaleString("vi-VN"));
console.log("Khai mạc:        ", kickoffDate.toLocaleString("vi-VN"));
console.log("Kết thúc:        ", endDate.toLocaleString("vi-VN"));
console.log("Thành viên/đội:  ", `${contest.min_team_size}-${contest.max_team_size} người`);
console.log("\nVòng thi:");
for (const r of contest.rounds) {
  console.log(`  - ${r.name}: ${r.score_criteria.length} tiêu chí, hạn nộp ${new Date(r.submission_deadline).toLocaleString("vi-VN")}`);
}
console.log("\nBước tiếp theo: đăng ký/tạo team, gán judge & mentor, sau đó activate round để bắt đầu demo.");

await mongoose.disconnect();
