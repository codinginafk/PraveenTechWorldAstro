import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));

console.log("=== ADDING EXPLICIT WIDTH & HEIGHT TO MDX IMAGES ===");

let fixedCount = 0;

for (const file of files) {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  const initial = content;

  // Convert markdown images ![Alt](/images/...) to <img src="/images/..." alt="Alt" width="1200" height="675" loading="lazy" decoding="async" class="rounded-xl border border-border my-6" />
  content = content.replace(
    /^!\[([^\]]+)\]\(([^)]+)\)$/gm,
    (match, alt, src) => `<img src="${src}" alt="${alt}" width="1200" height="675" loading="lazy" decoding="async" class="rounded-xl border border-border my-6" />`
  );

  if (content !== initial) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Added width/height to images in ${file}`);
    fixedCount++;
  }
}

console.log(`\nCompleted. Updated inline images in ${fixedCount} MDX files.`);
