const fs = require('fs');

const htmlPath = 'C:\\Users\\bunny\\.gemini\\antigravity\\brain\\db8d935a-7a82-4063-8e99-0c1135abc327\\.system_generated\\steps\\9486\\content.md';
if (!fs.existsSync(htmlPath)) {
  console.log('File does not exist: ' + htmlPath);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');

// Find all hrefs matching /blog/...
const hrefRegex = /href="\/blog\/([^"]+)"/g;
const links = [];
let match;
while ((match = hrefRegex.exec(html)) !== null) {
  links.push(match[1]);
}

console.log('=== DISTINCT BLOG LINKS FOUND ON LIVE HOMEPAGE ===');
console.log([...new Set(links)]);
