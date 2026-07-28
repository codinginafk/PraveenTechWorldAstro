import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));

console.log("=== TAG NORMALIZATION AUDIT & FIX SCRIPT ===");

let fixedArticles = 0;

for (const file of files) {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  // Regex to extract tags array from frontmatter
  const tagsMatch = content.match(/tags:\s*\n((?:\s*-\s*"?[^"\n]+"?.|\s*\[[^\]]+\])+)/);

  if (tagsMatch) {
    let rawTagsSection = tagsMatch[0];
    let newTagsSection = rawTagsSection;

    // Handle inline array format: tags: ["ai", "coding-assistants"]
    if (rawTagsSection.includes("[")) {
      const matchInline = rawTagsSection.match(/tags:\s*\[([^\]]+)\]/);
      if (matchInline) {
        const tagList = matchInline[1]
          .split(",")
          .map(t => t.replace(/["'\s]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
          .filter(Boolean);
        newTagsSection = `tags: [${tagList.map(t => `"${t}"`).join(", ")}]`;
      }
    } else {
      // Handle list format:
      // tags:
      //   - "ai workflows"
      const lines = rawTagsSection.split("\n");
      const normalizedLines = lines.map(line => {
        if (line.trim().startsWith("-")) {
          const rawTag = line.replace(/^\s*-\s*"?|"$/g, "").trim();
          const normalized = rawTag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          return `  - "${normalized}"`;
        }
        return line;
      });
      newTagsSection = normalizedLines.join("\n");
    }

    if (rawTagsSection !== newTagsSection) {
      content = content.replace(rawTagsSection, newTagsSection);
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`✅ Normalized tags in ${file}`);
      fixedArticles++;
    }
  }
}

console.log(`\nCompleted. Normalized tags in ${fixedArticles} articles.`);
