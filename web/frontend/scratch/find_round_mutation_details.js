import fs from 'fs';

const files = [
  'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/routes/round.js',
  'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/routes/teamRanking.js',
  'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/services/chatService.js',
  'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/services/contestService.js',
  'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/services/roundService.js'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('is_active =') || line.includes('scoring_locked =')) {
        console.log(`${f}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
