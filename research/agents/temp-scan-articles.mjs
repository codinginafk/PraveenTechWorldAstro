import fs from "fs";
import path from "path";
import { inspectUrl } from "./seo-agent/gsc-client.mjs";

const articlesDir = "src/content/articles";
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));

console.log(`Checking ${files.length} articles...`);

let indexed = 0;
let notFound = 0;

for (const f of files) {
  const slug = f.replace(/\.mdx$/, "");
  const urlPath = `/articles/${slug}`;
  const result = await inspectUrl(urlPath);
  const status = result?.verdict === "PASS" ? "INDEXED" 
    : result?.verdict === "NEUTRAL" ? "UNKNOWN"
    : result?.verdict || "ERROR";
  
  if (status === "INDEXED") {
    indexed++;
    console.log(`  ✅ INDEXED: ${slug}`);
  } else {
    notFound++;
  }
  
  // Rate limit: 1 req/sec
  await new Promise(r => setTimeout(r, 1100));
}

console.log(`\nDone. ${indexed} indexed, ${notFound} not found/unknown (out of ${files.length})`);
fs.rmSync(new URL(import.meta.url).pathname);
