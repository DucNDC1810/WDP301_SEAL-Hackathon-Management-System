import fs from 'fs';

const files = [
  'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/routes/finalist.js',
  'd:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src/controllers/finalistController.js'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  console.log('--- File:', f);
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('status') || line.includes('Team.findById') || line.includes('save') || line.includes('update')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
});
