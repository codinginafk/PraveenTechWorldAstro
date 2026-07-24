import fs from 'fs';
import path from 'path';

const dir = 'src/content/articles';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));

const categories = {};

files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf-8');
  const catMatch = content.match(/^category:\s*["']?(.*?)["']?$/m);
  const draftMatch = content.match(/^draft:\s*true$/m);
  if (catMatch && !draftMatch) {
    const cat = catMatch[1];
    categories[cat] = (categories[cat] || 0) + 1;
  }
});

console.log('=== PUBLISHED ARTICLE CATEGORIES AUDIT ===');
console.log(JSON.stringify(categories, null, 2));
