import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB.");

  const password_hash = await bcrypt.hash("123456", 10);
  const accounts = [];

  // Create Judges
  for (let i = 1; i <= 3; i++) {
    const email = `judge${i}@example.com`;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        full_name: `Giám khảo ${i}`,
        password_hash,
        status: "active",
        is_verified: true,
        roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "judge" }]
      });
      console.log(`Created Judge: ${email}`);
    } else {
        if (!user.roles.find(r => r.role_name === 'judge')) {
            user.roles.push({ role_id: new mongoose.Types.ObjectId(), role_name: "judge" });
            await user.save();
        }
    }
    accounts.push({ role: "Judge", name: `Giám khảo ${i}`, email, password: "123456" });
  }

  // Create Mentors
  for (let i = 1; i <= 3; i++) {
    const email = `mentor${i}@fpt.edu.vn`; // Mentor usually needs FPT email per rules
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        full_name: `Mentor ${i}`,
        password_hash,
        status: "active",
        is_verified: true,
        roles: [{ role_id: new mongoose.Types.ObjectId(), role_name: "mentor" }]
      });
      console.log(`Created Mentor: ${email}`);
    } else {
        if (!user.roles.find(r => r.role_name === 'mentor')) {
            user.roles.push({ role_id: new mongoose.Types.ObjectId(), role_name: "mentor" });
            await user.save();
        }
    }
    accounts.push({ role: "Mentor", name: `Mentor ${i}`, email, password: "123456" });
  }

  console.log("\n--- ACCOUNTS CREATED ---");
  console.table(accounts);

  await mongoose.disconnect();
}

run().catch(console.error);
