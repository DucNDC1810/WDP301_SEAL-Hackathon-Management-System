import fs from 'fs';

const filePath = 'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/frontend/src/pages/admin/hackathons/HackathonDetailPage.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('làm bài') || line.includes('Tổng thời') || line.includes('countdown') || line.includes('Hạn nộp') || line.includes('duration') || line.includes('submission_deadline')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
