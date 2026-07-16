import fs from 'fs';

const filePath = 'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/routes/finalist.js';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

lines.forEach((line, idx) => {
  if (line.includes('authorize')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
