import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const connStr = process.env.MONGODB_CONNECTION_STRING;
const dbName = process.env.DB_DATABASE || 'seal_hackathon';

const TeamSchema = new mongoose.Schema({
  team_name: String,
  status: String,
}, { strict: false });

const Team = mongoose.model('Team', TeamSchema);

async function run() {
  await mongoose.connect(connStr, { dbName });
  console.log("Connected to MongoDB");

  const result = await Team.updateOne(
    { team_name: "Ready-to-Code Beta" },
    { status: "WAITING_APPROVAL" }
  );

  console.log("Updated team status back to WAITING_APPROVAL:", result);
  await mongoose.disconnect();
}

run().catch(console.error);
