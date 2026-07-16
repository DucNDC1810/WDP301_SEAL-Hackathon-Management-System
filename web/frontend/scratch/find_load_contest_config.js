import fs from 'fs';

const filePath = 'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/frontend/src/pages/admin/hackathons/HackathonDetailPage.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

let start = -1;
lines.forEach((line, idx) => {
  if (line.includes('fetchContest =') || line.includes('const fetchContest')) {
    console.log(`${idx + 1}: ${line.trim()}`);
    start = idx;
  }
});

if (start !== -1) {
  console.log('--- Printing fetchContest function body ---');
  for (let i = start; i < Math.min(lines.length, start + 60); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
