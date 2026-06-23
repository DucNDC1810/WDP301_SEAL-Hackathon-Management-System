import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import Pool from "../src/models/Pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.DB_DATABASE,
  });

  const pools = await Pool.find().lean();
  console.log("Pools in DB:");
  pools.forEach(p => {
    console.log(`- ID: ${p._id}, name: ${p.pool_name}, round_id: ${p.round_id}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
