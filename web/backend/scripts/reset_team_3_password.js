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

  const password_hash = await bcrypt.hash("123456", 10);
  const result = await User.updateOne(
    { email: "leader.team3@fpt.edu.vn" },
    { $set: { password_hash } }
  );

  if (result.matchedCount > 0) {
    console.log("Successfully reset password for leader.team3@fpt.edu.vn to 123456");
  } else {
    console.log("User leader.team3@fpt.edu.vn not found.");
  }

  await mongoose.disconnect();
}

run().catch(console.error);
