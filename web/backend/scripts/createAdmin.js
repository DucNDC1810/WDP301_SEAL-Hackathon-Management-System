import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const userSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, default: null },
    provider: { type: String, enum: ["local", "google", "github"], default: "local" },
    provider_id: { type: String, default: null },
    avatar_url: { type: String, default: "" },
    phone: { type: String, default: "" },
    is_verified: { type: Boolean, default: false },
    roles: {
      type: [
        new mongoose.Schema(
          {
            role_id: { type: mongoose.Schema.Types.ObjectId, required: true },
            role_name: { type: String, required: true, enum: ["admin", "mentor", "contestant"] },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

const ADMIN_EMAIL = "admin@hackathon.com";
const ADMIN_PASSWORD = "Admin@123456";

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB");

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`Admin account already exists: ${ADMIN_EMAIL}`);
    // Cập nhật role thành admin nếu chưa có
    const hasAdmin = existing.roles.some((r) => r.role_name === "admin");
    if (!hasAdmin) {
      existing.roles.push({ role_id: new mongoose.Types.ObjectId(), role_name: "admin" });
      await existing.save();
      console.log("Updated existing account with admin role.");
    }
    await mongoose.disconnect();
    return;
  }

  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = new User({
    full_name: "System Admin",
    email: ADMIN_EMAIL,
    password_hash,
    provider: "local",
    is_verified: true,
    roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "admin" }],
  });

  await admin.save();
  console.log("Admin account created successfully!");
  console.log(`  Email   : ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  await mongoose.disconnect();
}

createAdmin().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
