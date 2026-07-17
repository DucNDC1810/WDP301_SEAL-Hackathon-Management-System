import fs from 'fs';

const filePath = 'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/frontend/src/pages/admin/hackathons/HackathonDetailPage.jsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

lines.forEach((line, idx) => {
  if (line.includes('fetch(') && (line.includes('/api/contests') || line.includes('/rounds') || line.includes('/round'))) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
