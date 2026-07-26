import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { Schema } = mongoose;

const roundSchema = new Schema({}, { strict: false });
const Round = mongoose.models.Round || mongoose.model("Round", roundSchema, "rounds");

async function run() {
  const uri = process.env.MONGODB_CONNECTION_STRING;
  const dbName = process.env.DB_DATABASE;
  await mongoose.connect(uri, { dbName });
  console.log("Connected to DB.");

  const rounds = await Round.find({});
  console.log(`Found ${rounds.length} rounds:`);
  for (const r of rounds) {
    console.log({
      id: r._id?.toString(),
      name: r.name,
      contest_id: r.contest_id?.toString(),
      is_active: r.is_active,
      scoring_locked: r.scoring_locked,
      status: r.status,
    });
  }

  await mongoose.disconnect();
}

run().catch(console.error);
