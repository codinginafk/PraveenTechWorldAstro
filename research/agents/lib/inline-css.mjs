import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../../../dist');

function getAllHtmlFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== '_astro' && file !== 'pagefind') {
        getAllHtmlFiles(filePath, files);
      }
    } else if (file.endsWith('.html')) {
      files.push(filePath);
    }
  }
  return files;
}

// Find the main CSS file
const astroAssetsDir = path.join(DIST_DIR, '_astro');
if (!fs.existsSync(astroAssetsDir)) {
  console.log("No _astro directory found. Skipping CSS inlining.");
  process.exit(0);
}

const cssFiles = fs.readdirSync(astroAssetsDir).filter(f => f.startsWith('global') && f.endsWith('.css'));
if (cssFiles.length === 0) {
  console.log("No global CSS file found. Skipping CSS inlining.");
  process.exit(0);
}

const cssFileName = cssFiles[0];
const cssFilePath = path.join(astroAssetsDir, cssFileName);
const cssContent = fs.readFileSync(cssFilePath, 'utf8');

console.log(`Found CSS file: ${cssFileName} (${cssContent.length} bytes)`);

// Find and replace in all HTML files
const htmlFiles = getAllHtmlFiles(DIST_DIR);
console.log(`Scanning ${htmlFiles.length} HTML files...`);

let replacedCount = 0;
for (const htmlFile of htmlFiles) {
  let content = fs.readFileSync(htmlFile, 'utf8');
  
  // Look for any link tag referencing the css file
  const linkRegex = new RegExp(`<link[^>]*href="[^"]*${cssFileName}"[^>]*>`, 'gi');
  if (linkRegex.test(content)) {
    content = content.replace(linkRegex, `<style>${cssContent}</style>`);
    fs.writeFileSync(htmlFile, content, 'utf8');
    replacedCount++;
  }
}

console.log(`Successfully inlined CSS in ${replacedCount} HTML files.`);
