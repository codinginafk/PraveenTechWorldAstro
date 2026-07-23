import fs from 'fs';
import path from 'path';

const dir = 'src/content/articles';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));

let fixedTitles = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 1. Fix Stray Quote in Titles
  content = content.replace(/^title:\s*["'](.*?)Not Charging' (.*?)["']$/m, (match, p1, p2) => {
    modified = true;
    fixedTitles++;
    return `title: "${p1}Not Charging? ${p2}"`;
  });

  content = content.replace(/^title:\s*["'](.*? Broken)' (.*?)["']$/m, (match, p1, p2) => {
    modified = true;
    fixedTitles++;
    return `title: "${p1}? ${p2}"`;
  });

  content = content.replace(/^title:\s*["'](.*? Working)' (.*?)["']$/m, (match, p1, p2) => {
    modified = true;
    fixedTitles++;
    return `title: "${p1}? ${p2}"`;
  });

  content = content.replace(/^seoTitle:\s*["'](.*?Not Charging)' (.*?)["']$/m, (match, p1, p2) => {
    modified = true;
    return `seoTitle: "${p1}? ${p2}"`;
  });

  // 2. Fix .svg extensions in coverImage ONLY if .jpg exists
  content = content.replace(/^coverImage:\s*["'](\/images\/generated\/.*?)\.jpg["']$/m, (match, p1) => {
    const jpgPath = path.join('public', p1 + '.jpg');
    const svgPath = path.join('public', p1 + '.svg');
    if (!fs.existsSync(jpgPath) && fs.existsSync(svgPath)) {
      modified = true;
      return `coverImage: "${p1}.svg"`;
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Fixed QA issues in:', file);
  }
});

console.log(`\nCleaned ${fixedTitles} titles!`);
