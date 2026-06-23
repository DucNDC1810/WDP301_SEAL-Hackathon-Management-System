import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import JudgeAssignment from "../src/models/JudgeAssignment.js";
import MentorAssignment from "../src/models/MentorAssignment.js";
import Pool from "../src/models/Pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });

  console.log("Connected to MongoDB.");

  // Clean stale JudgeAssignments
  const judgeAssignments = await JudgeAssignment.find();
  for (const ja of judgeAssignments) {
    if (ja.pool_id) {
      const poolExists = await Pool.exists({ _id: ja.pool_id });
      if (!poolExists) {
        console.log(`Deleting stale JudgeAssignment ${ja._id} (referenced pool ${ja.pool_id} does not exist)`);
        await JudgeAssignment.deleteOne({ _id: ja._id });
      }
    }
  }

  // Clean stale MentorAssignments
  const mentorAssignments = await MentorAssignment.find();
  for (const ma of mentorAssignments) {
    if (ma.board_id) {
      const poolExists = await Pool.exists({ _id: ma.board_id });
      if (!poolExists) {
        console.log(`Deleting stale MentorAssignment ${ma._id} (referenced pool ${ma.board_id} does not exist)`);
        await MentorAssignment.deleteOne({ _id: ma._id });
      }
    }
  }

  console.log("Cleanup done.");
  await mongoose.disconnect();
}

run().catch(console.error);
