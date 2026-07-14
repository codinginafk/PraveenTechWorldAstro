import fs from 'node:fs';
import path from 'node:path';

const searchDir = "C:/Users/bunny/AppData/Local/npm-cache/_npx/44b85dff014d9ceb/node_modules/omniroute";

function findInFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findInFiles(filePath);
    } else {
      if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.mjs') || file.endsWith('.json')) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.toLowerCase().includes('user safety') || content.toLowerCase().includes('safety: safe')) {
          console.log(`Match in: ${filePath}`);
        }
      }
    }
  }
}

findInFiles(searchDir);
console.log("Search complete.");
