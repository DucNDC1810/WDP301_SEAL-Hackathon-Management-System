import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const userSchema = new mongoose.Schema(
  {
    full_name:     { type: String, required: true },
    email:         { type: String, required: true, unique: true, lowercase: true },
    password_hash: { type: String, default: null },
    provider:      { type: String, default: "local" },
    is_verified:   { type: Boolean, default: true },
    roles: {
      type: [
        new mongoose.Schema(
          { role_id:   { type: mongoose.Schema.Types.ObjectId, required: true },
            role_name: { type: String, required: true, enum: ["admin","mentor","judge","contestant"] } },
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
  // ── Mentors ──────────────────────────────────────────────────────────────
  { full_name: "ThS. Le Thi Huong",    email: "huong.le@fpt.edu.vn",    password: "Mentor@123456", role_name: "mentor" },
  { full_name: "ThS. Pham Quoc Bao",   email: "bao.pham@fpt.edu.vn",    password: "Mentor@123456", role_name: "mentor" },
  { full_name: "TS. Tran Minh Khoa",   email: "khoa.tran@fpt.edu.vn",   password: "Mentor@123456", role_name: "mentor" },

  // ── Judges ───────────────────────────────────────────────────────────────
  { full_name: "Nguyen Duc Anh",       email: "anh.judge@seal.com",     password: "Judge@123456",  role_name: "judge"  },
  { full_name: "Dr. Vo Thi Mai",       email: "mai.judge@seal.com",     password: "Judge@123456",  role_name: "judge"  },
  { full_name: "Bui Thanh Long",       email: "long.judge@seal.com",    password: "Judge@123456",  role_name: "judge"  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("✓ Connected to MongoDB\n");

  for (const acc of ACCOUNTS) {
    const existing = await User.findOne({ email: acc.email });
    if (existing) {
      console.log(`⚠  ${acc.email} already exists — skipped`);
      continue;
    }

    const password_hash = await bcrypt.hash(acc.password, 10);
    await User.create({
      full_name:    acc.full_name,
      email:        acc.email,
      password_hash,
      provider:     "local",
      is_verified:  true,
      roles:        [{ role_id: new mongoose.Types.ObjectId(), role_name: acc.role_name }],
    });

    console.log(`✓ [${acc.role_name.padEnd(8)}] ${acc.full_name}`);
    console.log(`   Email   : ${acc.email}`);
    console.log(`   Password: ${acc.password}\n`);
  }

  console.log("✅ Hoàn thành!");
  await mongoose.disconnect();
}

seed().catch(e => { console.error("✗ Error:", e.message); process.exit(1); });
