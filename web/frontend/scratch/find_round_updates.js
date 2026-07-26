import fs from 'fs';
const content = fs.readFileSync('d:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/services/roundService.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Round.') || line.includes('Contest.findByIdAndUpdate') || line.includes('scoring_locked')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
