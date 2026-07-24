import fs from 'fs';
import path from 'path';

const dir = 'src/content/articles';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));

let count = 0;
files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  if (/^category:\s*["']?(\S+?)\s+["']?$/m.test(content)) {
    content = content.replace(/^category:\s*["']?(\S+?)\s+["']?$/m, 'category: "$1"');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Trimmed category whitespace in:', file);
    count++;
  }
});

console.log(`Trimmed category whitespace in ${count} files.`);
