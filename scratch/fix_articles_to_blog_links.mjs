import fs from 'fs';
import path from 'path';

const dir = 'src/content/articles';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));

let totalReplacements = 0;
let filesModified = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Replace (/articles/slug) with (/blog/slug)
  content = content.replace(/\(\/articles\//g, '(/blog/');
  
  // Replace (file:///src/content/articles/slug.mdx) with (/blog/slug)
  content = content.replace(/\(file:\/\/\/src\/content\/articles\/(.*?)\.mdx\)/g, '(/blog/$1)');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    filesModified++;
    const count = (original.match(/\(\/articles\//g) || []).length + (original.match(/\(file:\/\/\/src\/content\/articles\//g) || []).length;
    totalReplacements += count;
    console.log(`Fixed ${count} broken /articles/ links in: ${file}`);
  }
});

console.log(`\nFixed total ${totalReplacements} broken links across ${filesModified} files!`);
