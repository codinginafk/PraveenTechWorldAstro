import fs from "fs";
import path from "path";

const searchDirs = ["src/components", "src/layouts", "src/pages", "src/content"];

console.log("=== FIXING INTERNAL REDIRECT INLINKS ===");

const replacements = [
  { from: /\/privacy(?=["'\s>#?])/g, to: "/terms" },
  { from: /\/services\/karama(?=["'\s>#?])/g, to: "/about" },
  { from: /\/services\/bur-dubai(?=["'\s>#?])/g, to: "/about" },
  { from: /\/services\/dubai(?=["'\s>#?])/g, to: "/about" },
  { from: /\/services(?=["'\s>#?])/g, to: "/about" },
  { from: /\/contact(?=["'\s>#?])/g, to: "/about" },
  { from: /\/author\/praveen(?=["'\s>#?])/g, to: "/about" },
  { from: /\/guides\/seo(?=["'\s>#?])/g, to: "/guides/website-setup" },
  { from: /\/guides\/business(?=["'\s>#?])/g, to: "/guides/productivity" },
  { from: /\/guides\/AI%20%26%20Workflows(?=["'\s>#?])/g, to: "/guides/ai-workflows" },
  { from: /\/guides\/AI%20&%20Workflows(?=["'\s>#?])/g, to: "/guides/ai-workflows" },
  { from: /\/guides\/AI\s*&\s*Workflows(?=["'\s>#?])/g, to: "/guides/ai-workflows" },
  { from: /\/guides\/Engineering%20%26%20Dev-Ops(?=["'\s>#?])/g, to: "/guides/it-operations" },
  { from: /\/guides\/Engineering%20&%20Dev-Ops(?=["'\s>#?])/g, to: "/guides/it-operations" },
  { from: /\/guides\/Engineering\s*&\s*Dev-Ops(?=["'\s>#?])/g, to: "/guides/it-operations" },
];

function walkDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (/\.(astro|mdx|html|jsx|tsx|js|ts)$/.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

let totalFilesFixed = 0;

for (const dir of searchDirs) {
  const files = walkDir(dir);
  for (const filePath of files) {
    let content = fs.readFileSync(filePath, "utf8");
    let initialContent = content;

    for (const rule of replacements) {
      content = content.replace(rule.from, rule.to);
    }

    if (content !== initialContent) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`✅ Fixed redirect inlinks in ${filePath}`);
      totalFilesFixed++;
    }
  }
}

console.log(`\nCompleted. Updated internal links across ${totalFilesFixed} files.`);
