import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import Contest from "../src/models/Contest.js";

async function fastForward() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("✓ Connected to MongoDB");

  // Find all open contests
  const contests = await Contest.find({ status: "open" });
  if (contests.length === 0) {
    console.log("No ongoing contests found.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${contests.length} ongoing contest(s).`);

  for (const contest of contests) {
    console.log(`Processing contest: ${contest.title}`);
    let updated = false;

    for (const round of contest.rounds) {
      if (round.is_active) {
        console.log(`  - Found active round: "${round.name}" (Current deadline: ${round.submission_deadline})`);
        
        // Set submission deadline to 5 minutes in the past
        const pastDate = new Date(Date.now() - 5 * 60 * 1000);
        round.submission_deadline = pastDate;
        
        console.log(`  - Updated submission_deadline to: ${pastDate}`);
        updated = true;
      }
    }

    if (updated) {
      await contest.save();
      console.log(`✓ Saved changes for contest: ${contest.title}`);
    } else {
      console.log(`  - No active round found in contest: ${contest.title}`);
    }
  }

  await mongoose.disconnect();
  console.log("✓ Disconnected from MongoDB");
}

fastForward().catch(console.error);
