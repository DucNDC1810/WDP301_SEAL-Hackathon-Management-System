import fs from 'fs';
import path from 'path';

const searchDir = (dir) => {
  const list = fs.readdirSync(dir);
  list.forEach(f => {
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('.status') && (line.includes('CONFIRMED') || line.includes('ACTIVE'))) {
          console.log(`${fullPath}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
  });
};

searchDir('d:/WDP301_SEAL-Hackathon-Management-System-Develop/web/frontend/src');
