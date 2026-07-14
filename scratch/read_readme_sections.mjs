import fs from 'node:fs';
import path from 'node:path';

const readmePath = "C:/Users/bunny/AppData/Local/npm-cache/_npx/44b85dff014d9ceb/node_modules/omniroute/README.md";
const content = fs.readFileSync(readmePath, 'utf8');
const lines = content.split('\n');

const keywords = ["a2a", "task", "offload", "skill", "agent-to-agent", "registered_keys", "user id", "mcp"];
console.log(`Searching README.md for keywords: ${keywords.join(', ')}`);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const kw of keywords) {
    if (line.toLowerCase().includes(kw)) {
      console.log(`[Line ${i+1}] [${kw}]: ${line.trim()}`);
      break;
    }
  }
}
