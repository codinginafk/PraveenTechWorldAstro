import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));

console.log("=== HEADING HIERARCHY AUDIT & FIX SCRIPT ===");

let headingIssues = 0;

for (const file of files) {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  // Remove frontmatter
  const body = content.replace(/---[\s\S]*?---/, "");

  const lines = body.split("\n");
  let h1Count = 0;
  let prevLevel = 1; // Main page H1 is assumed level 1

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      const match = trimmed.match(/^(#+)\s+(.*)/);
      if (match) {
        const level = match[1].length;
        const text = match[2];

        if (level === 1) {
          h1Count++;
        }

        // Check for skipped heading levels (e.g. H2 followed immediately by H4)
        if (level > prevLevel + 1 && prevLevel !== 0) {
          console.log(`⚠️ Skipped heading level in ${file}:${lineIdx + 1} (H${prevLevel} -> H${level}): "${text}"`);
          headingIssues++;
        }
        prevLevel = level;
      }
    }
  });

  if (h1Count > 0) {
    console.log(`⚠️ Multiple H1s in body of ${file}: ${h1Count} H1 tags found`);
    headingIssues++;
  }
}

console.log(`\nAudit Complete. Total heading structure issues found: ${headingIssues}`);
