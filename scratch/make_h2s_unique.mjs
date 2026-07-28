import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));

console.log("=== MAKING GENERIC H2s UNIQUE ACROSS ARTICLES ===");

let count = 0;

for (const file of files) {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  const initial = content;

  // Extract title from frontmatter
  const titleMatch = content.match(/title:\s*"([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : "";

  if (title) {
    // 1. Make References & Further Reading unique
    content = content.replace(
      /^##\s*(?:\d+\.\s*)?References\s*(?:&|and)\s*Further\s*Reading\s*$/gm,
      `## References & Further Reading for ${title}`
    );

    // 2. Make Direct Answer unique
    content = content.replace(
      /^##\s*Direct\s*Answer\s*$/gm,
      `## Direct Answer: ${title}`
    );

    // 3. Make Further Reading unique
    content = content.replace(
      /^##\s*(?:\d+\.\s*)?Further\s*Reading\s*$/gm,
      `## Further Reading for ${title}`
    );
  }

  if (content !== initial) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Made H2s unique in ${file}`);
    count++;
  }
}

console.log(`\nCompleted. Made H2s unique across ${count} MDX files.`);
