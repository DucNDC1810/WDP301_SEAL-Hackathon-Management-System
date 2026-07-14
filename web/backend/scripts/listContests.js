import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import Contest from "../src/models/Contest.js";

async function list() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });
  console.log("✓ Connected to MongoDB");

  const contests = await Contest.find({}, "title _id status code");
  console.log("Contests in database:");
  console.log(JSON.stringify(contests, null, 2));

  await mongoose.disconnect();
}

list().catch(console.error);
