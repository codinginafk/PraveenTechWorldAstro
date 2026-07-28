import fs from "fs";
import path from "path";

function findEmptyAnchors(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      findEmptyAnchors(fullPath);
    } else if (file.endsWith(".astro") || file.endsWith(".mdx") || file.endsWith(".html")) {
      const content = fs.readFileSync(fullPath, "utf8");
      
      // Match <a> tags
      const aMatches = content.match(/<a\s+[^>]*>/gi) || [];
      for (const aTag of aMatches) {
        if (!aTag.includes("aria-label=") && !aTag.includes("title=")) {
          // Check if it wraps an icon or SVG only without visible text
          const index = content.indexOf(aTag);
          const snippet = content.slice(index, index + 250);
          if (/<svg/i.test(snippet) && !/>\s*[^<\s]+/i.test(snippet)) {
            console.log(`⚠️ Potential empty anchor without aria-label in ${file}:`, aTag);
          }
        }
      }
    }
  }
}

console.log("=== CHECKING EMPTY ANCHOR TAGS ===");
findEmptyAnchors("src");
