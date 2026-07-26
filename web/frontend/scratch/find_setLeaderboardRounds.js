import fs from 'fs';
const content = fs.readFileSync('d:/WDP301_SEAL-Hackathon-Management-System-Develop/web/frontend/src/pages/admin/hackathons/HackathonDetailPage.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('setLeaderboardRounds')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
