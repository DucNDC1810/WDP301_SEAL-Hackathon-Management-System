import fs from 'fs';
const content = fs.readFileSync('d:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/controllers/roundController.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('judgeCompletion')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
