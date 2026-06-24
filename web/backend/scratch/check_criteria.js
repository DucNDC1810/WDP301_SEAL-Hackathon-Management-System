import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, { dbName: process.env.DB_DATABASE });

const Criteria = mongoose.model("Criteria", new mongoose.Schema({}, { strict: false }), "criterias");
const all = await Criteria.find({}).lean();
console.log("Total Criteria docs:", all.length);
all.forEach(c => {
  console.log(`  _id=${c._id} | round_id=${c.round_id} | name=${c.name} | weight=${c.weight}`);
});

await mongoose.disconnect();
