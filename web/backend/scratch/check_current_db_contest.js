import "dotenv/config";
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Round from '../src/models/Round.js';
import Contest from '../src/models/Contest.js';

async function check() {
  await connectDB();

  const contest = await Contest.findById("6a590325bc78ac6f24385384");
  if (!contest) {
    console.log("Contest not found!");
  } else {
    console.log("=== CONTEST:", contest.title);
    console.log("Rounds count:", contest.rounds?.length);
    contest.rounds.forEach(r => {
      console.log(`- Round #${r.round_number} (${r._id}): name=${r.name}, is_active=${r.is_active}, coding_duration_hours=${r.coding_duration_hours}, submission_deadline=${r.submission_deadline}`);
    });
  }

  const rounds = await Round.find({ contest_id: "6a590325bc78ac6f24385384" });
  console.log("=== STANDALONE ROUNDS:");
  rounds.forEach(r => {
    console.log(`- Round #${r.sequence_order} (${r._id}): name=${r.name}, is_active=${r.is_active}, coding_duration_hours=${r.coding_duration_hours}, submission_deadline=${r.submission_deadline}`);
  });

  mongoose.connection.close();
}

check();
