import fs from "node:fs";
import path from "node:path";

const articlesDir = "./src/content/articles";

if (!fs.existsSync(articlesDir)) {
  console.log("No articles directory found. Skipping check.");
  process.exit(0);
}

const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx") || f.endsWith(".md"));
const titleMap = new Map();
let hasErrors = false;

for (const file of files) {
  const content = fs.readFileSync(path.join(articlesDir, file), "utf8");
  const match = content.match(/^---([\s\S]*?)---/);
  
  if (match) {
    const yamlStr = match[1];
    const titleMatch = yamlStr.match(/title:\s*"(.*?)"/i) || yamlStr.match(/title:\s*([^\r\n]*)/i);
    
    if (titleMatch) {
      const title = titleMatch[1].trim().toLowerCase().replace(/"/g, "");
      
      if (titleMap.has(title)) {
        const duplicateFile = titleMap.get(title);
        console.error(`\x1b[31m❌ DUPLICATE TITLE DETECTED:\x1b[0m
  Title: "${title}"
  File A: ${duplicateFile}
  File B: ${file}
  Please merge these articles to prevent keyword cannibalization!`);
        hasErrors = true;
      } else {
        titleMap.set(title, file);
      }
    }
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log("\x1b[32m✅ Title Linting Passed: No duplicate article titles detected.\x1b[0m");
  process.exit(0);
}
