import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

// Load env
dotenv.config({ path: "../.env" });

// Load models
import "../src/models/User.js";

const User = mongoose.model("User");

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB database:", process.env.DB_DATABASE);

  const password = "12345678";
  const passwordHash = await bcrypt.hash(password, 10);

  const emails = ["saobang@example.com", "phuonghoang@example.com"];
  const result = await User.updateMany(
    { email: { $in: emails } },
    { $set: { password_hash: passwordHash } }
  );

  console.log(`Updated passwords for ${result.modifiedCount} users.`);
  await mongoose.disconnect();
}

run().catch(console.error);
