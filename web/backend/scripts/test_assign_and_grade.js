import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

import Contest from "../src/models/Contest.js";
import Team from "../src/models/Team.js";
import Pool from "../src/models/Pool.js";
import User from "../src/models/User.js";
import JudgeAssignment from "../src/models/JudgeAssignment.js";
import Score from "../src/models/Score.js";
import ScoreDetail from "../src/models/ScoreDetail.js";
import Submission from "../src/models/Submission.js";
import Ranking from "../src/models/Ranking.js";
import PresentationSlot from "../src/models/PresentationSlot.js";

import { assignJudge } from "../src/services/judgeAssignmentService.js";
import { createScore } from "../src/services/scoreService.js";
import { calculateRankings } from "../src/services/rankingService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB.");

  // 1. Lấy/Tạo cuộc thi mẫu
  let contest = await Contest.findOne({ title: "Giải đấu Test Phân Công & Chấm Điểm" });
  if (!contest) {
    contest = await Contest.create({
      title: "Giải đấu Test Phân Công & Chấm Điểm",
      description: "Giải đấu mẫu dùng để test phân công nhiều giám khảo và chấm điểm trung bình",
      status: "open",
      rounds: [
        {
          round_number: 1,
          name: "Vòng 1 - Loại",
          is_active: true,
          score_criteria: [
            { name: "Sáng tạo", max_score: 10, weight: 0.4 },
            { name: "Kỹ thuật", max_score: 10, weight: 0.6 }
          ]
        },
        {
          round_number: 2,
          name: "Vòng 2 - Chung kết",
          is_active: false,
          score_criteria: [
            { name: "Sáng tạo", max_score: 10, weight: 0.5 },
            { name: "Kỹ thuật", max_score: 10, weight: 0.5 }
          ]
        }
      ]
    });
    console.log("✓ Đã tạo cuộc thi test mới");
  } else {
    contest.status = "open";
    contest.rounds[0].is_active = true;
    contest.rounds[0].scoring_locked = false;
    await contest.save();
    console.log("✓ Sử dụng cuộc thi test sẵn có");
  }

  const round = contest.rounds[0];
  const contestId = contest._id.toString();
  const roundId = round._id.toString();

  // Reset dữ liệu cũ của vòng test
  await JudgeAssignment.deleteMany({ contest_id: contestId, round_id: roundId });
  await Score.deleteMany({ contest_id: contestId, round_id: roundId });
  await Submission.deleteMany({ round_id: roundId });
  await Ranking.deleteMany({ contest_id: contestId, round_id: roundId });
  await PresentationSlot.deleteMany({ contest_id: contestId, round_id: roundId });
  await Pool.deleteMany({ contest_id: contestId });
  console.log("✓ Đã dọn dẹp dữ liệu cũ");

  // 2. Tạo/Tìm 3 tài khoản Giám khảo
  const judges = [];
  const judgeEmails = ["judgeA@test.com", "judgeB@test.com", "judgeC@test.com"];
  for (let i = 0; i < 3; i++) {
    let u = await User.findOne({ email: judgeEmails[i] });
    if (!u) {
      u = await User.create({
        full_name: `Giám khảo Test ${String.fromCharCode(65 + i)}`,
        email: judgeEmails[i],
        is_verified: true,
        roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "judge" }]
      });
    }
    judges.push(u);
  }
  console.log("✓ Giám khảo sẵn sàng:", judges.map(j => j.full_name).join(", "));

  // 3. Tạo 3 Đội thi mẫu và Bảng đấu
  const teamNames = ["Đội Hỏa Long", "Đội Bạch Hổ", "Đội Huyền Vũ"];
  const teams = [];
  for (let i = 0; i < 3; i++) {
    let t = await Team.findOne({ team_name: teamNames[i], contest_id: contestId });
    if (!t) {
      t = await Team.create({
        contest_id: contestId,
        team_name: teamNames[i],
        leader_id: judges[0]._id, // mượn tạm
        status: "CONFIRMED"
      });
    }
    teams.push(t);
  }

  // Tạo Bảng đấu A
  const pool = await Pool.create({
    contest_id: contestId,
    pool_name: "Bảng A (Test)",
    teams: teams.map(t => t._id)
  });
  
  // Cập nhật pool_id cho các đội
  for (const t of teams) {
    t.pool_id = pool._id;
    await t.save();
  }
  console.log("✓ Đã tạo Bảng A với 3 đội:", teams.map(t => t.team_name).join(", "));

  // 4. Phân công cả 2 Giám khảo A và Giám khảo B chấm Bảng A
  console.log("\n--- Tiến hành phân công giám khảo ---");
  const assignA = await assignJudge({
    contest_id: contestId,
    round_id: roundId,
    pool_id: pool._id,
    judge_id: judges[0]._id,
    judge_type: "INTERNAL",
    assigned_by: judges[0]._id
  });
  console.log(`✓ Đã phân công ${judges[0].full_name} chấm ${pool.pool_name}`);

  const assignB = await assignJudge({
    contest_id: contestId,
    round_id: roundId,
    pool_id: pool._id,
    judge_id: judges[1]._id,
    judge_type: "INTERNAL",
    assigned_by: judges[0]._id
  });
  console.log(`✓ Đã phân công ${judges[1].full_name} chấm ${pool.pool_name}`);

  // 5. Tạo bài nộp mẫu cho các đội
  for (const t of teams) {
    await Submission.create({
      repo_url: "https://github.com/test/repo",
      slide_url: "https://docs.google.com/presentation/test",
      team_id: t._id,
      round_id: roundId,
      status: "SUBMITTED"
    });
  }
  console.log("✓ Đã tạo bài nộp cho các đội");

  // 5b. Tạo PresentationSlot đã đặt lịch (booked) trong quá khứ để hợp lệ hóa việc chấm
  for (const t of teams) {
    await PresentationSlot.create({
      contest_id: contestId,
      round_id: roundId,
      pool_id: pool._id,
      start_time: new Date(Date.now() - 10 * 60 * 1000), // 10 phút trước
      end_time: new Date(Date.now() + 10 * 60 * 1000), // 10 phút sau
      room: "Phòng A",
      booked_team_id: t._id,
      booked_at: new Date(),
      status: "booked"
    });
  }
  console.log("✓ Đã tạo lịch trình bày hợp lệ cho các đội");

  // 6. Giám khảo A và B tiến hành nhập điểm
  console.log("\n--- Tiến hành chấm điểm ---");
  
  // Đội 1: Judge A chấm (Sáng tạo: 8, Kỹ thuật: 9), Judge B chấm (Sáng tạo: 7, Kỹ thuật: 8)
  // Điểm TB Sáng tạo: 7.5, TB Kỹ thuật: 8.5. Tổng điểm TB: 7.5 * 0.4 + 8.5 * 0.6 = 8.1
  await createScore({
    team_id: teams[0]._id,
    judge_id: judges[0]._id,
    contest_id: contestId,
    round_id: roundId,
    submit: true,
    score_details: [
      { criteria_name: "Sáng tạo", score_value: 8, weight: 0.4, max_score: 10 },
      { criteria_name: "Kỹ thuật", score_value: 9, weight: 0.6, max_score: 10 }
    ]
  });
  await createScore({
    team_id: teams[0]._id,
    judge_id: judges[1]._id,
    contest_id: contestId,
    round_id: roundId,
    submit: true,
    score_details: [
      { criteria_name: "Sáng tạo", score_value: 7, weight: 0.4, max_score: 10 },
      { criteria_name: "Kỹ thuật", score_value: 8, weight: 0.6, max_score: 10 }
    ]
  });
  console.log("✓ Đã chấm điểm cho Đội Hỏa Long");

  // Đội 2: Judge A chấm (Sáng tạo: 9.5, Kỹ thuật: 9.5), Judge B chấm (Sáng tạo: 8.5, Kỹ thuật: 9.5)
  // Điểm TB Sáng tạo: 9.0, TB Kỹ thuật: 9.5. Tổng điểm TB: 9.0 * 0.4 + 9.5 * 0.6 = 9.3
  await createScore({
    team_id: teams[1]._id,
    judge_id: judges[0]._id,
    contest_id: contestId,
    round_id: roundId,
    submit: true,
    score_details: [
      { criteria_name: "Sáng tạo", score_value: 9.5, weight: 0.4, max_score: 10 },
      { criteria_name: "Kỹ thuật", score_value: 9.5, weight: 0.6, max_score: 10 }
    ]
  });
  await createScore({
    team_id: teams[1]._id,
    judge_id: judges[1]._id,
    contest_id: contestId,
    round_id: roundId,
    submit: true,
    score_details: [
      { criteria_name: "Sáng tạo", score_value: 8.5, weight: 0.4, max_score: 10 },
      { criteria_name: "Kỹ thuật", score_value: 9.5, weight: 0.6, max_score: 10 }
    ]
  });
  console.log("✓ Đã chấm điểm cho Đội Bạch Hổ");

  // Đội 3: Judge A chấm (Sáng tạo: 6, Kỹ thuật: 5), Judge B chấm (Sáng tạo: 5, Kỹ thuật: 5)
  // Điểm TB Sáng tạo: 5.5, TB Kỹ thuật: 5.0. Tổng điểm TB: 5.5 * 0.4 + 5.0 * 0.6 = 5.2
  await createScore({
    team_id: teams[2]._id,
    judge_id: judges[0]._id,
    contest_id: contestId,
    round_id: roundId,
    submit: true,
    score_details: [
      { criteria_name: "Sáng tạo", score_value: 6, weight: 0.4, max_score: 10 },
      { criteria_name: "Kỹ thuật", score_value: 5, weight: 0.6, max_score: 10 }
    ]
  });
  await createScore({
    team_id: teams[2]._id,
    judge_id: judges[1]._id,
    contest_id: contestId,
    round_id: roundId,
    submit: true,
    score_details: [
      { criteria_name: "Sáng tạo", score_value: 5, weight: 0.4, max_score: 10 },
      { criteria_name: "Kỹ thuật", score_value: 5, weight: 0.6, max_score: 10 }
    ]
  });
  console.log("✓ Đã chấm điểm cho Đội Huyền Vũ");

  // 7. Thực hiện Tính xếp hạng và kết quả
  console.log("\n--- Tiến hành tính bảng xếp hạng ---");
  const rankings = await calculateRankings(contestId, roundId);
  
  console.log("\n--- BẢNG XẾP HẠNG TOÀN DIỄN (GLOBAL RANKING) ---");
  rankings.forEach(r => {
    console.log(`Hạng ${r.rank_position}: Đội "${r.team_name}" - Điểm TB: ${r.final_score} - qualified: ${r.qualified}`);
  });

  // Verify: Đội Bạch Hổ phải có điểm 9.3 và đứng hạng 1, Đội Hỏa Long có điểm 8.1 đứng hạng 2, Đội Huyền Vũ có điểm 5.2 đứng hạng 3.
  const rank1 = rankings.find(r => r.rank_position === 1);
  const rank2 = rankings.find(r => r.rank_position === 2);
  const rank3 = rankings.find(r => r.rank_position === 3);

  console.log("\n--- Kết quả kiểm chứng tự động ---");
  if (
    rank1 && rank1.team_name === "Đội Bạch Hổ" && rank1.final_score === 9.3 &&
    rank2 && rank2.team_name === "Đội Hỏa Long" && rank2.final_score === 8.1 &&
    rank3 && rank3.team_name === "Đội Huyền Vũ" && rank3.final_score === 5.2
  ) {
    console.log("🟢 KIỂM THỬ THÀNH CÔNG: Điểm trung bình và vị trí xếp hạng hoàn toàn chính xác!");
  } else {
    console.log("🔴 KIỂM THỬ THẤT BẠI: Số liệu tính toán xếp hạng hoặc điểm số bị sai lệch!");
  }

  await mongoose.disconnect();
}

run().catch(console.error);
