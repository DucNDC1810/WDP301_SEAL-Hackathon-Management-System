import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { Schema } = mongoose;
const contestSchema = new Schema({}, { strict: false });
const Contest = mongoose.models.Contest || mongoose.model("Contest", contestSchema, "contests");

async function run() {
  const uri = process.env.MONGODB_CONNECTION_STRING;
  const dbName = process.env.DB_DATABASE;
  await mongoose.connect(uri, { dbName });
  console.log("Connected to DB.");

  const list = await Contest.find({}, "title created_at");
  console.log("CONTESTS:");
  list.forEach(c => {
    console.log(`- ID: ${c._id}, Title: ${c.title}, Created At: ${c.created_at}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
