import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "../../src/content/articles");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".mdx"));

const articles = {};
for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), "utf-8");
  const titleMatch = content.match(/^title: "(.+?)"/m);
  const slug = f.replace(".mdx", "");
  articles[slug] = { file: f, title: titleMatch ? titleMatch[1] : slug, outbound: [], inbound: new Set() };
}

const linkRe = /\/blog\/([\w-]+)/g;
for (const [slug, article] of Object.entries(articles)) {
  const content = fs.readFileSync(path.join(dir, article.file), "utf-8");
  let match;
  while ((match = linkRe.exec(content)) !== null) {
    const target = match[1];
    if (target !== slug && articles[target]) {
      article.outbound.push(target);
      articles[target].inbound.add(slug);
    }
  }
}

console.log("=== ARTICLES WITH ZERO INBOUND LINKS (ORPHANS) ===");
const orphans = Object.entries(articles).filter(([s, a]) => a.inbound.size === 0);
orphans.forEach(([s, a]) => console.log("  " + a.title + " (" + s + ")"));
console.log("\nCount: " + orphans.length);

console.log("\n=== ARTICLES WITH ZERO OUTBOUND INTERNAL LINKS (DEADENDS) ===");
const deadends = Object.entries(articles).filter(([s, a]) => a.outbound.length === 0);
deadends.forEach(([s, a]) => console.log("  " + a.title + " (" + s + ")"));
console.log("\nCount: " + deadends.length);

// Print inbound counts for all articles
console.log("\n=== INBOUND LINK COUNTS ===");
Object.entries(articles)
  .sort((a, b) => a[1].inbound.size - b[1].inbound.size)
  .forEach(([s, a]) => console.log("  " + a.inbound.size + " inbound: " + a.title));
