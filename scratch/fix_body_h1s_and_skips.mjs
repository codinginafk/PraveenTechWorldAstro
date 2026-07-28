import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));

console.log("=== FIXING BODY H1S AND HEADING SKIPS ===");

let fixedCount = 0;

for (const file of files) {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  // Split frontmatter and body
  const parts = content.split(/^---\s*$/m);
  if (parts.length < 3) continue;

  const frontmatter = parts[1];
  let body = parts.slice(2).join("---");

  let modified = false;
  const lines = body.split("\n");
  let prevLevel = 2; // H2 after H1 page title

  const newLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      const match = trimmed.match(/^(#+)\s+(.*)/);
      if (match) {
        let level = match[1].length;
        const text = match[2];

        // 1. Demote any body H1 (#) to H2 (##)
        if (level === 1) {
          level = 2;
          modified = true;
        }

        // 2. Fix skipped levels (e.g. H2 followed immediately by H4 or H1 -> H3)
        if (level > prevLevel + 1 && prevLevel > 0) {
          level = prevLevel + 1;
          modified = true;
        }

        prevLevel = level;
        return `${"#".repeat(level)} ${text}`;
      }
    }
    return line;
  });

  if (modified) {
    const newContent = `---\n${frontmatter}\n---` + newLines.join("\n");
    fs.writeFileSync(filePath, newContent, "utf8");
    console.log(`✅ Fixed heading hierarchy in ${file}`);
    fixedCount++;
  }
}

console.log(`\nCompleted. Fixed heading structure in ${fixedCount} articles.`);
