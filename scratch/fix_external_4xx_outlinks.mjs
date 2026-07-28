import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));

console.log("=== FIXING EXTERNAL 4XX OUTLINKS ===");

let fixedCount = 0;

for (const file of files) {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  const initial = content;

  // 1. Fix Wikipedia Core Web Vitals 404
  content = content.replace(
    /https:\/\/en\.wikipedia\.org\/wiki\/Core_Web_Vitals/g,
    "https://en.wikipedia.org/wiki/Web_performance"
  );

  // 2. Fix OpenAI ChatGPT 403
  content = content.replace(
    /https:\/\/openai\.com\/index\/chatgpt\/?/g,
    "https://chatgpt.com/"
  );

  // 3. Fix OpenAI Privacy Policy 403
  content = content.replace(
    /https:\/\/openai\.com\/policies\/privacy-policy\/?/g,
    "https://openai.com/privacy/"
  );

  if (content !== initial) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Updated external links in ${file}`);
    fixedCount++;
  }
}

console.log(`\nCompleted. Updated external outlinks in ${fixedCount} MDX files.`);
