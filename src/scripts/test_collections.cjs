const fs = require('fs');
const path = require('path');

const dir = 'src/content/articles';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));

console.log(`Checking ${files.length} MDX files...`);
const now = new Date();
console.log(`Current Time (now): ${now.toISOString()}`);

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  
  // Extract frontmatter
  const match = content.match(/^---([\s\S]*?)---/);
  if (!match) {
    console.log(`❌ NO FRONTMATTER: ${f}`);
    return;
  }
  
  const lines = match[1].split('\n');
  let draft = false;
  let publishDate = null;
  let title = '';
  
  lines.forEach(l => {
    const parts = l.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
      if (key === 'draft') draft = val === 'true';
      if (key === 'publishDate') publishDate = val;
      if (key === 'title') title = val;
    }
  });
  
  const pubDateObj = publishDate ? new Date(publishDate) : null;
  const isPast = pubDateObj ? pubDateObj <= now : false;
  
  if (f.includes('docker') || f.includes('search') || f.includes('debull')) {
    console.log(`File: ${f}`);
    console.log(`  title: "${title}"`);
    console.log(`  draft: ${draft}`);
    console.log(`  publishDate: ${publishDate} -> Parsed: ${pubDateObj ? pubDateObj.toISOString() : 'null'}`);
    console.log(`  isPast (<= now): ${isPast}`);
    console.log(`  Will render on homepage: ${!draft && isPast}`);
  }
});
