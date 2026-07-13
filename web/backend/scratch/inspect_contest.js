import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { Schema } = mongoose;

const contestSchema = new Schema({}, { strict: false });
const Contest = mongoose.models.Contest || mongoose.model("Contest", contestSchema, "contests");

const poolSchema = new Schema({}, { strict: false });
const Pool = mongoose.models.Pool || mongoose.model("Pool", poolSchema, "pools");

async function run() {
  const uri = process.env.MONGODB_CONNECTION_STRING;
  const dbName = process.env.DB_DATABASE;
  await mongoose.connect(uri, { dbName });
  console.log("Connected to DB.");

  const contestId = "6a3e0a2c7a8d2172112e1962";
  const contest = await Contest.findById(contestId);
  if (!contest) {
    console.log("Contest not found!");
    await mongoose.disconnect();
    return;
  }

  console.log("Contest Status:", contest.get("status"));
  console.log("Rounds:", contest.get("rounds"));

  const pools = await Pool.find({ contest_id: new mongoose.Types.ObjectId(contestId) });
  console.log(`Found ${pools.length} pools:`);
  for (const p of pools) {
    console.log({
      id: p._id?.toString(),
      name: p.get("pool_name"),
      round_id: p.get("round_id")?.toString(),
      drive_link: p.get("drive_link")
    });
  }

  await mongoose.disconnect();
}

run().catch(console.error);
