import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));

console.log("=== FIXING MDX ARTICLE REDIRECT LINKS ===");

let count = 0;

for (const file of files) {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  const initial = content;

  content = content.replace(/\]\(\/services\/karama\)/g, "](/about)");
  content = content.replace(/\]\(\/services\/bur-dubai\)/g, "](/about)");
  content = content.replace(/\]\(\/services\/dubai\)/g, "](/about)");
  content = content.replace(/\]\(\/services\)/g, "](/about)");

  if (content !== initial) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Fixed markdown redirect links in ${file}`);
    count++;
  }
}

console.log(`\nCompleted. Updated ${count} MDX files.`);
