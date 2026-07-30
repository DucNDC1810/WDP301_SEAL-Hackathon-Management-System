import dotenv from "dotenv";
import mongoose from "mongoose";

// Load env
dotenv.config({ path: "../.env" });

// Load models
import "../src/models/Contest.js";

const Contest = mongoose.model("Contest");

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB database:", process.env.DB_DATABASE);

  const contests = await Contest.find({}).lean();
  console.log("All Contests:");
  contests.forEach(c => {
    console.log(`- ID: ${c._id}, Title: "${c.title}"`);
    if (c.rounds) {
      c.rounds.forEach(r => {
        console.log(`  * Round ${r.round_number}: ${r.name}, Active: ${r.is_active}, Deadline: ${r.submission_deadline}`);
      });
    }
  });

  await mongoose.disconnect();
}

run().catch(console.error);
