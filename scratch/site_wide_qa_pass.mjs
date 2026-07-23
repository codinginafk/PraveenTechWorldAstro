import fs from 'fs';
import path from 'path';

const dir = 'src/content/articles';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));

console.log('=== SITE-WIDE QA AUDIT (88 ARTICLES) ===\n');

let issues = [];

files.forEach(file => {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 1. Title stray quotes or encoding bugs
  const titleMatch = content.match(/^title:\s*["']?(.*?)["']?$/m);
  if (titleMatch) {
    const title = titleMatch[1];
    if (title.includes("Not Charging'") || title.includes("Fixes'") || title.includes("Issues'") || title.includes("' ")) {
      issues.push({ file, type: 'Stray Quote in Title', details: title });
    }
  }

  // 2. Cover image format (.svg check)
  const coverMatch = content.match(/^coverImage:\s*["']?(.*?)["']?$/m);
  if (coverMatch && coverMatch[1].endsWith('.svg')) {
    issues.push({ file, type: 'SVG Cover Image (Needs JPG/PNG)', details: coverMatch[1] });
  }

  // 3. Image Alt Mismatch
  const altMatch = content.match(/^imageAlt:\s*["']?(.*?)["']?$/m);
  if (altMatch) {
    const alt = altMatch[1].toLowerCase();
    if (file.includes('android') && alt.includes('iphone')) {
      issues.push({ file, type: 'Image Alt Mismatch (iPhone on Android)', details: altMatch[1] });
    }
    if (file.includes('windows') && alt.includes('macbook')) {
      issues.push({ file, type: 'Image Alt Mismatch (Macbook on Windows)', details: altMatch[1] });
    }
  }

  // 4. Thin word count / Cut-off text
  const bodyText = content.replace(/^---[\s\S]*?---/, '').trim();
  const wordCount = bodyText.split(/\s+/).length;
  if (wordCount < 800) {
    issues.push({ file, type: 'Thin Word Count (<800 words)', details: `${wordCount} words` });
  }

  if (content.includes('Since 20...') || /[\w\s]{20}\.\.\.\s*$/m.test(bodyText)) {
    issues.push({ file, type: 'Cut-off / Incomplete Text', details: 'Unfinished sentence' });
  }
});

console.log('Total issues found across 88 articles:', issues.length);
console.log(JSON.stringify(issues, null, 2));
