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
  const Team = mongoose.model("Team_test", schema, "teams");
  const User = mongoose.model("User_test", schema, "users");

  // Find an admin user to generate a token or just mock the request inside the service
  // Or we can just call the service method approveTeam directly to see if it throws an error!
  const { approveTeam } = await import("../src/services/teamService.js");
  
  // Find a team with WAITING_APPROVAL status
  const team = await Team.findOne({ status: "WAITING_APPROVAL" });
  if (!team) {
    console.log("No team in WAITING_APPROVAL status found.");
  } else {
    console.log(`Found team: ${team.team_name} (${team._id}) with status ${team.status}`);
    try {
      const updated = await approveTeam(team._id);
      console.log("Success! Approved team, new status:", updated.status);
    } catch (err) {
      console.error("Error running approveTeam service function:", err);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
