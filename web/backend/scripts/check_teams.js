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

  const schema = new mongoose.Schema({}, { strict: false });
  const Team = mongoose.model("Team_inspect", schema, "teams");

  const teams = await Team.find({ contest_id: new mongoose.Types.ObjectId("6a31195a4edec3b79ecbf601") });
  console.log(`\nFound ${teams.length} teams for contest 6a31195a4edec3b79ecbf601:`);
  teams.forEach(t => {
    console.log(`ID: ${t._id}, Name: ${t.team_name}, Status: ${t.status}, Members: ${t.members?.length}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
