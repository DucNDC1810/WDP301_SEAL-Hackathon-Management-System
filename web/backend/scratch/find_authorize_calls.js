import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.git') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

walkDir('d:/WDP301_SEAL-Hackathon-Management-System-Develop/web/backend/src', filePath => {
  if (filePath.endsWith('.js')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('authorize(')) {
        console.log(`${filePath}:${idx+1}: ${line.trim()}`);
      }
    });
  }
});
