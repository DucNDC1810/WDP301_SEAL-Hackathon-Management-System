import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { Schema } = mongoose;

const contestSchema = new Schema({}, { strict: false });
const Contest = mongoose.models.Contest || mongoose.model("Contest", contestSchema, "contests");

const roundSchema = new Schema({}, { strict: false });
const Round = mongoose.models.Round || mongoose.model("Round", roundSchema, "rounds");

async function run() {
  const uri = process.env.MONGODB_CONNECTION_STRING;
  const dbName = process.env.DB_DATABASE;
  await mongoose.connect(uri, { dbName });
  console.log("Connected to DB.");

  const contestId = "6a55ebe95c9f1c94f847fe49";
  const contest = await Contest.findById(contestId);
  console.log("Contest rounds in DB:");
  console.log(JSON.stringify(contest?.rounds, null, 2));

  const rounds = await Round.find({ contest_id: new mongoose.Types.ObjectId(contestId) });
  console.log("Standalone Rounds in DB:");
  console.log(JSON.stringify(rounds, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
