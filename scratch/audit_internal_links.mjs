import fs from "fs";
import path from "path";

const ARTICLES_DIR = "src/content/articles";
const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"));
const allSlugs = new Set(files.map(f => f.replace(".mdx", "")));

console.log(`=== FULL SITE INTERNAL LINK & HEALTH AUDIT (${files.length} articles) ===`);

const brokenLinks = [];
const inboundLinkCounts = new Map();
allSlugs.forEach(s => inboundLinkCounts.set(s, 0));

for (const file of files) {
  const slug = file.replace(".mdx", "");
  const content = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf-8");

  // Find all /blog/... links
  const linkRegex = /href=["'](\/blog\/[^"']+)["']|\[([^\]]+)\]\((\/blog\/[^\)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const rawLink = match[1] || match[3];
    const targetSlug = rawLink.replace(/^\/blog\//, "").split("#")[0].split("?")[0].replace(/\/$/, "");

    if (!allSlugs.has(targetSlug)) {
      brokenLinks.push({ sourceFile: file, rawLink, targetSlug });
    } else {
      inboundLinkCounts.set(targetSlug, (inboundLinkCounts.get(targetSlug) || 0) + 1);
    }
  }
}

console.log(`\n1. Broken Internal /blog/ Links Found: ${brokenLinks.length}`);
if (brokenLinks.length > 0) {
  brokenLinks.forEach(b => {
    console.log(`  ❌ In ${b.sourceFile} -> Links to non-existent '/blog/${b.targetSlug}'`);
  });
} else {
  console.log("  ✅ Zero broken internal article links detected.");
}

const orphans = [];
inboundLinkCounts.forEach((count, s) => {
  if (count === 0) orphans.push(s);
});

console.log(`\n2. Inbound Link Distribution:`);
console.log(`- Orphan Articles (0 inbound links from other articles): ${orphans.length}`);
if (orphans.length > 0) {
  console.log(`  Top 10 orphans:`, orphans.slice(0, 10));
}
