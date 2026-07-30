import dotenv from "dotenv";
import mongoose from "mongoose";

// Load env
dotenv.config({ path: "../.env" });

// Load models
import "../src/models/Contest.js";
import "../src/models/Round.js";

const Contest = mongoose.model("Contest");
const Round = mongoose.model("Round");

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB database:", process.env.DB_DATABASE);

  // Set the deadline to 10 minutes ago
  const expiredTime = new Date(Date.now() - 10 * 60 * 1000);
  console.log(`Setting submission deadline to past time: ${expiredTime.toISOString()}`);

  // 1. Update standalone Round documents for round_number = 1 or name containing "sơ loại"
  const standaloneResult = await Round.updateMany(
    {
      $or: [
        { round_number: 1 },
        { type: "PRELIMINARY" },
        { name: /sơ loại/i }
      ]
    },
    {
      $set: {
        submission_deadline: expiredTime
      }
    }
  );
  console.log(`Updated ${standaloneResult.modifiedCount} standalone Round documents.`);

  // 2. Update embedded rounds inside Contest documents
  const contests = await Contest.find({});
  let embeddedCount = 0;
  for (const contest of contests) {
    let modified = false;
    if (contest.rounds && contest.rounds.length > 0) {
      contest.rounds.forEach(r => {
        if (r.round_number === 1 || r.name.toLowerCase().includes("sơ loại")) {
          r.submission_deadline = expiredTime;
          modified = true;
          embeddedCount++;
        }
      });
    }
    if (modified) {
      await contest.save();
    }
  }
  console.log(`Updated ${embeddedCount} embedded rounds inside Contest documents.`);

  await mongoose.disconnect();
  console.log("Database connection closed. Done.");
}

run().catch(console.error);
