import fs from 'fs';

const files = [
  'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/controllers/be2RoundController.js',
  'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/routes/be2RoundRoute.js',
  'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/routes/roundRoute.js'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('judge-completion') || line.includes('judgeCompletion') || line.includes('getJudgeCompletion')) {
        console.log(`${f}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
