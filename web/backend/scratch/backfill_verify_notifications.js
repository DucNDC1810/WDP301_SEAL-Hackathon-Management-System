/**
 * Backfill notifications for pending verifications that were submitted before the enum fix.
 * Run: node scratch/backfill_verify_notifications.js
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

  // Get all users with pending verification
  const pendingUsers = await User.find({ profile_verify_status: "pending" });
  console.log(`Found ${pendingUsers.length} users with pending verifications`);

  if (pendingUsers.length === 0) {
    console.log("No pending verifications found.");
    await mongoose.disconnect();
    return;
  }

  // Get all admin users
  const admins = await User.find({ "roles.role_name": "admin" });
  const adminIds = admins.map((a) => a._id);
  console.log(`Found ${admins.length} admins to notify`);

  let created = 0;
  for (const pendingUser of pendingUsers) {
    for (const adminId of adminIds) {
      // Check if a notification for this user already exists for this admin
      const existing = await Notification.findOne({
        user_id: adminId,
        type: "VERIFICATION_REQUESTED",
        ref_id: pendingUser._id,
        is_read: false,
      });

      if (existing) {
        console.log(
          `  ↳ Notification for "${pendingUser.full_name}" → admin already exists, skipping.`
        );
        continue;
      }

      await Notification.create({
        user_id: adminId,
        type: "VERIFICATION_REQUESTED",
        title: "Yêu cầu xác thực hồ sơ mới",
        message: `Người dùng "${pendingUser.full_name}" đã gửi yêu cầu xác thực thông tin cá nhân.`,
        ref_id: pendingUser._id,
        ref_type: "User",
        is_read: false,
      });
      created++;
      console.log(
        `  ✓ Created notification for "${pendingUser.full_name}" → admin ${adminId}`
      );
    }
  }

  console.log(`\n✓ Done! Created ${created} notification(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error:", err);
  mongoose.disconnect();
  process.exit(1);
});
