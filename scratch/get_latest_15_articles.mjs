import fs from 'fs';
import path from 'path';

const dir = 'src/content/articles';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));

const articles = files.map(file => {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const dateMatch = content.match(/^publishDate:\s*["']?(.*?)["']?$/m);
  const draftMatch = content.match(/^draft:\s*true$/m);
  return {
    file,
    filePath,
    date: dateMatch ? dateMatch[1] : '1970-01-01',
    draft: !!draftMatch
  };
}).filter(a => !a.draft).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

console.log('=== LATEST 15 PUBLISHED ARTICLES ===');
articles.slice(0, 15).forEach((a, i) => {
  console.log(`${i+1}. [${a.date}] ${a.file}`);
});
