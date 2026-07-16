import fs from 'fs';
import path from 'path';

const searchDir = (dir) => {
  const list = fs.readdirSync(dir);
  list.forEach(f => {
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (f.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('judge-completion') || content.includes('/judge-completion')) {
        console.log(`Found candidate: ${fullPath}`);
      }
    }
  });
};

searchDir('d:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src');
