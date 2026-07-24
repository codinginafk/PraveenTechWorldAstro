import fs from 'fs';
import path from 'path';

const dir = 'src/content/articles';

// 1. gemini-3-6-flash-vs-3-5-flash-complete-guide.mdx
let f1 = path.join(dir, 'gemini-3-6-flash-vs-3-5-flash-complete-guide.mdx');
if (fs.existsSync(f1)) {
  let c1 = fs.readFileSync(f1, 'utf-8');
  c1 = c1.replace(/\blandscape\b/g, 'ecosystem');
  fs.writeFileSync(f1, c1, 'utf-8');
}

// 2. best-free-ai-logo-generators-in-2026.mdx
let f2 = path.join(dir, 'best-free-ai-logo-generators-in-2026.mdx');
if (fs.existsSync(f2)) {
  let c2 = fs.readFileSync(f2, 'utf-8');
  c2 = c2.replace(/\bintricate\b/g, 'detailed');
  fs.writeFileSync(f2, c2, 'utf-8');
}

// 3. docker-volume-permission-denied-fixes.mdx
let f3 = path.join(dir, 'docker-volume-permission-denied-fixes.mdx');
if (fs.existsSync(f3)) {
  let c3 = fs.readFileSync(f3, 'utf-8');
  c3 = c3.replace(/\bAdditionally,\b/g, 'Also,');
  c3 = c3.replace(/\bAdditionally\b/g, 'Also');
  fs.writeFileSync(f3, c3, 'utf-8');
}

console.log('Cleaned remaining AI words!');
