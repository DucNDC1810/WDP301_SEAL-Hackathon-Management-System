import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("Connected to MongoDB.");

  // Import Contest
  const schema = new mongoose.Schema({}, { strict: false });
  const Contest = mongoose.model("Contest_inspect", schema, "contests");
  const Team = mongoose.model("Team_inspect", schema, "teams");

  const contests = await Contest.find({});
  console.log("\n--- CONTESTS ---");
  contests.forEach(c => {
    console.log(`ID: ${c._id}, Title: ${c.title}, Status: ${c.status}`);
  });

  const teamsCount = await Team.countDocuments({});
  console.log(`\nTotal Teams in DB: ${teamsCount}`);

  await mongoose.disconnect();
}

run().catch(console.error);
