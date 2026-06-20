/**
 * Migration: Fix corrupted Vietnamese round names in MongoDB
 *
 * Corrupted pattern examples:
 *   "Vọng So Kh?o"  → "Vòng Sơ Khảo"
 *   "Vọng Chung K?t" → "Vòng Chung Kết"
 *
 * Run: node scripts/fix-round-names.js
 */

import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING;
const DB_NAME = process.env.DB_DATABASE || "seal_hackathon";

// Map of corrupted string fragments → correct UTF-8 replacements
// U+FFFD is the Unicode Replacement Character inserted when bytes couldn't be decoded
const FFFD = "�";

const ROUND_NAME_MAP = [
  // U+FFFD replacement character patterns (e.g. V�ng = Vòng)
  { bad: new RegExp(`V${FFFD}ng So Kh${FFFD}o`, "g"),   good: "Vòng Sơ Khảo" },
  { bad: new RegExp(`V${FFFD}ng Chung K${FFFD}t`, "g"), good: "Vòng Chung Kết" },
  { bad: new RegExp(`V${FFFD}ng S${FFFD} Lo${FFFD}i`, "g"), good: "Vòng Sơ Loại" },
  { bad: new RegExp(`V${FFFD}ng S${FFFD} kh${FFFD}o`, "gi"), good: "Vòng Sơ Khảo" },
  // Generic U+FFFD fallbacks for individual words
  { bad: new RegExp(`V${FFFD}ng`, "g"),  good: "Vòng" },
  { bad: new RegExp(`Kh${FFFD}o`, "g"), good: "Khảo" },
  { bad: new RegExp(`K${FFFD}t`, "g"),  good: "Kết" },
  { bad: new RegExp(`Lo${FFFD}i`, "g"), good: "Loại" },
  { bad: new RegExp(`S${FFFD} `, "g"),  good: "Sơ " },
  { bad: new RegExp(`S${FFFD}`, "g"),   good: "Sơ" },
  // "So Khảo" (ơ dropped entirely) → "Sơ Khảo"
  { bad: /\bSo Khảo\b/g, good: "Sơ Khảo" },
  { bad: /\bSo Loại\b/g, good: "Sơ Loại" },
  { bad: /\bSo loại\b/g, good: "Sơ loại" },
  // Legacy ? patterns (if stored literally as question marks)
  { bad: /Kh\?o/g,  good: "Khảo" },
  { bad: /K\?t/g,   good: "Kết" },
  { bad: /Lo\?i/g,  good: "Loại" },
  { bad: /S\? /g,   good: "Sơ " },
];

function fixName(name) {
  if (!name) return name;
  let fixed = name;
  for (const { bad, good } of ROUND_NAME_MAP) {
    fixed = fixed.replace(bad, good);
  }
  return fixed;
}

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  console.log("Connected.");

  const db = mongoose.connection.db;
  const contests = await db.collection("contests").find({}).toArray();

  console.log(`Found ${contests.length} contests to check.`);

  let totalFixed = 0;

  for (const contest of contests) {
    if (!Array.isArray(contest.rounds)) continue;

    let changed = false;
    const updatedRounds = contest.rounds.map((round) => {
      const originalName = round.name;
      const fixedName = fixName(originalName);
      if (fixedName !== originalName) {
        console.log(
          `  Contest "${contest.title}" | Round ${round.round_number}: "${originalName}" → "${fixedName}"`
        );
        changed = true;
        totalFixed++;
        return { ...round, name: fixedName };
      }
      return round;
    });

    if (changed) {
      await db.collection("contests").updateOne(
        { _id: contest._id },
        { $set: { rounds: updatedRounds } }
      );
    }
  }

  console.log(`\nDone. Fixed ${totalFixed} round name(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
