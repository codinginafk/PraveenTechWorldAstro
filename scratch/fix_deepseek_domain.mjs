import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));

console.log("=== FIXING DEEPSEEK DOMAIN OUTLINKS ===");

let fixedCount = 0;

for (const file of files) {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  const initial = content;

  content = content.replace(/https:\/\/deepseek\.co\/?/g, "https://www.deepseek.com/");

  if (content !== initial) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Fixed DeepSeek URL in ${file}`);
    fixedCount++;
  }
}

console.log(`\nCompleted. Updated ${fixedCount} MDX files.`);
