import fs from 'fs';
const content = fs.readFileSync('d:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/services/roundService.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('checkJudgeCompletion')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
