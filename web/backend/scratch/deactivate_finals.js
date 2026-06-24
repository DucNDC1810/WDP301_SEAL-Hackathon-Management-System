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

  // Deactivate Vòng chung kết (6a3bca495cf18bff2565538c)
  const res = await Round.updateOne(
    { _id: new mongoose.Types.ObjectId("6a3bca495cf18bff2565538c") },
    { $set: { is_active: false, status: "DRAFT" } }
  );
  console.log("Update result:", res);

  await mongoose.disconnect();
}

run().catch(console.error);
