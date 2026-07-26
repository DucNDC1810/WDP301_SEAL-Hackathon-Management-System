import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import Notification from "../src/models/Notification.js";
import User from "../src/models/User.js";

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("✓ Connected to MongoDB");

  // Get first user
  const admin = await User.findOne({ "roles.role_name": "admin" });
  if (!admin) {
    console.error("No admin user found.");
    process.exit(1);
  }

  try {
    const notif = await Notification.create({
      user_id: admin._id,
      type: "VERIFICATION_REQUESTED",
      title: "Yêu cầu xác thực hồ sơ mới",
      message: `Người dùng "Test User" đã gửi yêu cầu xác thực thông tin cá nhân.`,
      ref_id: admin._id,
      ref_type: "User",
      is_read: false,
    });
    console.log("✓ Successfully created notification with ref_type: User!");
    console.log("Notification ID:", notif._id);
    
    // Clean up
    await Notification.findByIdAndDelete(notif._id);
    console.log("✓ Cleaned up test notification.");
  } catch (err) {
    console.error("❌ Failed to create notification:", err);
  }

  await mongoose.disconnect();
}

run();
