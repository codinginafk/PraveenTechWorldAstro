const fs = require('fs');
const path = require('path');

const dir = 'public/images/generated';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

console.log(`Checking ${files.length} SVG files for unescaped characters...`);
let broken = 0;

files.forEach(f => {
  const filePath = path.join(dir, f);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const rawAmpersands = [...content.matchAll(/&(?!(amp|lt|gt|quot|apos|#\d+);)/g)];
  if (rawAmpersands.length > 0) {
    console.log(`❌ INVALID XML (unescaped &): ${f} contains ${rawAmpersands.length} raw ampersands.`);
    broken++;
    
    // Automatically fix it
    const fixed = content.replace(/&(?!(amp|lt|gt|quot|apos|#\d+);)/g, '&amp;');
    fs.writeFileSync(filePath, fixed, 'utf8');
    console.log(`  -> Auto-fixed raw ampersands in ${f}`);
  }
});

console.log(`Done. Fixed ${broken} broken SVG files.`);
