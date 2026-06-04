import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
  dbName: process.env.DB_DATABASE,
});

const ADMIN_EMAIL = "admin@hackathon.com";
const NEW_PASSWORD = "Admin@123456";

const user = await mongoose.connection.collection("users").findOne({ email: ADMIN_EMAIL });
if (!user) {
  console.log("Admin not found.");
  process.exit(1);
}

const password_hash = await bcrypt.hash(NEW_PASSWORD, 10);
await mongoose.connection.collection("users").updateOne(
  { email: ADMIN_EMAIL },
  { $set: { password_hash, is_verified: true } }
);

console.log(`Password reset for ${ADMIN_EMAIL}`);
console.log(`New password: ${NEW_PASSWORD}`);
await mongoose.disconnect();
