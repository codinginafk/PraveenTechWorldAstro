import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));

console.log("=== COMPREHENSIVE CONTENT OPPORTUNITY AUDIT ===");

const opportunities = {
  thinContent: [],
  lowInternalLinks: [],
  missingFAQSchema: [],
  missingCodeBlocks: []
};

files.forEach(file => {
  const filePath = path.join(articlesDir, file);
  const content = fs.readFileSync(filePath, "utf8");

  // Word count estimation
  const textOnly = content.replace(/---[\s\S]*?---/, "").replace(/```[\s\S]*?```/g, "").replace(/<[^>]+>/g, "");
  const wordCount = textOnly.trim().split(/\s+/).length;

  // Internal link count
  const internalLinks = (content.match(/\[([^\]]+)\]\(\/(blog|guides)\/[^)]+\)/g) || []).length;

  // FAQ schema in frontmatter
  const hasFAQ = content.includes("faq:");

  // Code block count
  const hasCodeBlocks = content.includes("```");

  if (wordCount < 1100) {
    opportunities.thinContent.push({ file, wordCount });
  }

  if (internalLinks < 2) {
    opportunities.lowInternalLinks.push({ file, internalLinks });
  }

  if (!hasFAQ) {
    opportunities.missingFAQSchema.push({ file });
  }
});

console.log(`Total Articles Scanned: ${files.length}`);
console.log(`Thin Articles (< 1,100 words): ${opportunities.thinContent.length}`);
console.log(`Low Internal Link Articles (< 2 internal links): ${opportunities.lowInternalLinks.length}`);
console.log(`Missing FAQ Schema: ${opportunities.missingFAQSchema.length}`);

console.log("\n--- THIN CONTENT ARTICLES TO EXPAND ---");
opportunities.thinContent.forEach(item => {
  console.log(`  - ${item.file} (${item.wordCount} words)`);
});

console.log("\n--- ARTICLES REQUIRING INTERNAL LINK MESHING ---");
opportunities.lowInternalLinks.forEach(item => {
  console.log(`  - ${item.file} (${item.internalLinks} links)`);
});

fs.writeFileSync("research/reports/content_opportunities_report.json", JSON.stringify(opportunities, null, 2));
