import fs from 'fs';

const filePath = 'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/frontend/src/pages/admin/hackathons/HackathonDetailPage.jsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

lines.forEach((line, idx) => {
  if (line.includes('save') || line.includes('API') || line.includes('updateContest') || line.includes('submit')) {
    if (line.includes('async') || line.includes('function') || line.includes('const') || line.includes('await')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
