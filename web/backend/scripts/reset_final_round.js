/**
 * reset_final_round.js
 * Reset vòng Chung kết của seed data về is_active: false để test lại flow kích hoạt
 *
 * Chạy: node scripts/reset_final_round.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Round from "../src/models/Round.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function reset() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("🔗 Connected to MongoDB\n");

  // Tìm tất cả round FINAL đang active
  const activeFinaRounds = await Round.find({ type: "FINAL", is_active: true });

  if (activeFinaRounds.length === 0) {
    console.log("ℹ️  Không có vòng FINAL nào đang active.");
  } else {
    for (const r of activeFinaRounds) {
      await Round.updateOne({ _id: r._id }, { $set: { is_active: false } });
      console.log(`✔ Reset is_active → false: "${r.name}" (${r._id})`);
    }
  }

  // Hiển thị toàn bộ vòng FINAL hiện có
  const allFinals = await Round.find({ type: "FINAL" }).select("name is_active round_end contest_id");
  console.log("\n📋 Danh sách tất cả vòng FINAL sau khi reset:");
  allFinals.forEach((r) => {
    console.log(`  - "${r.name}"  is_active=${r.is_active}  ID: ${r._id}`);
    console.log(`    URL kích hoạt: http://localhost:5173/round/${r._id}/activate`);
  });

  await mongoose.disconnect();
  console.log("\n✅ Xong! Refresh lại trang để thấy trạng thái CHƯA KÍCH HOẠT.\n");
}

reset().catch(console.error);
