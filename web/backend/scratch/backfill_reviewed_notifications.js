/**
 * Backfill notifications for users whose verifications were already approved/rejected
 * but did NOT receive a notification (due to the enum bug).
 * Run: node scratch/backfill_reviewed_notifications.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import User from "../src/models/User.js";
import Notification from "../src/models/Notification.js";

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("✓ Connected to MongoDB");

  // Find users that have been reviewed (approved or rejected) but may not have gotten notified
  const reviewedUsers = await User.find({
    profile_verify_status: { $in: ["approved", "rejected"] },
  }).select("_id full_name profile_verify_status profile_verify_note");

  console.log(`Found ${reviewedUsers.length} reviewed users`);

  let created = 0;
  for (const u of reviewedUsers) {
    // Check if a VERIFICATION_REVIEWED notification already exists for this user
    const existing = await Notification.findOne({
      user_id: u._id,
      type: "VERIFICATION_REVIEWED",
    });

    if (existing) {
      console.log(`  ↳ "${u.full_name}" already has a review notification. Skipping.`);
      continue;
    }

    const isApproved = u.profile_verify_status === "approved";
    await Notification.create({
      user_id: u._id,
      type: "VERIFICATION_REVIEWED",
      title: isApproved
        ? "Hồ sơ của bạn đã được xác thực"
        : "Yêu cầu xác thực hồ sơ bị từ chối",
      message: isApproved
        ? "Chúc mừng! Hồ sơ thông tin cá nhân của bạn đã được phê duyệt."
        : `Yêu cầu xác thực thông tin cá nhân bị từ chối. Lý do: ${u.profile_verify_note || "Không có"}`,
      ref_id: u._id,
      ref_type: "User",
      is_read: false,
    });
    created++;
    console.log(
      `  ✓ Created review notification for "${u.full_name}" (${u.profile_verify_status})`
    );
  }

  console.log(`\n✓ Done! Created ${created} notification(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error:", err);
  mongoose.disconnect();
  process.exit(1);
});
