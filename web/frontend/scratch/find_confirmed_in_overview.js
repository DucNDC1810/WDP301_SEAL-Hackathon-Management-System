import fs from 'fs';

const filePath = 'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/frontend/src/pages/student/overview/StudentOverviewPage.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('CONFIRMED') || line.includes('status') && line.includes('ACTIVE')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
