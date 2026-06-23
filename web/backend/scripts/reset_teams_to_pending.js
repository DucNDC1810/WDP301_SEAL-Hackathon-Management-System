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

  const result = await Team.updateMany(
    { contest_id: new mongoose.Types.ObjectId("6a31195a4edec3b79ecbf601") },
    { $set: { status: "WAITING_APPROVAL" } }
  );
  console.log(`Updated ${result.modifiedCount} teams to WAITING_APPROVAL.`);

  await mongoose.disconnect();
}

run().catch(console.error);
