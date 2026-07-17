import fs from 'fs';
import path from 'path';

const searchDir = (dir) => {
  const list = fs.readdirSync(dir);
  list.forEach(f => {
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('Đang diễn ra') || content.includes('Đã kết thúc') || content.includes('Chưa diễn ra')) {
        console.log(`Found: ${fullPath}`);
      }
    }
  });
};

searchDir('d:/WDP301_SEAL-Hackathon-Management-System-Develop/web/frontend/src');
