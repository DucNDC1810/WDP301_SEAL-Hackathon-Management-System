import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const userSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true },
    email:     { type: String, required: true, unique: true, lowercase: true },
    password_hash: { type: String, default: null },
    provider:  { type: String, default: "local" },
    is_verified: { type: Boolean, default: false },
    roles: {
      type: [
        new mongoose.Schema(
          { role_id: { type: mongoose.Schema.Types.ObjectId, required: true },
            role_name: { type: String, required: true, enum: ["admin","mentor","contestant"] } },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

const ACCOUNTS = [
  {
    full_name: "System Admin",
    email: "admin@seal.com",
    password: "Admin@123456",
    role_name: "admin",
    is_verified: true,
  },
  {
    full_name: "Nguyen Van User",
    email: "user@seal.com",
    password: "User@123456",
    role_name: "contestant",
    is_verified: true,
  },
  {
    full_name: "Dr. Nguyen Van Mentor",
    email: "mentor@fpt.edu.vn",
    password: "Mentor@123456",
    role_name: "mentor",
    is_verified: true,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB\n");

  for (const acc of ACCOUNTS) {
    const existing = await User.findOne({ email: acc.email });

    if (existing) {
      console.log(`⚠  ${acc.email} already exists — skipped`);
      continue;
    }

    const password_hash = await bcrypt.hash(acc.password, 10);
    await User.create({
      full_name: acc.full_name,
      email: acc.email,
      password_hash,
      provider: "local",
      is_verified: acc.is_verified,
      roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: acc.role_name }],
    });

    console.log(`✓  Created [${acc.role_name}]`);
    console.log(`   Email   : ${acc.email}`);
    console.log(`   Password: ${acc.password}\n`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
