import fs from "fs";
import path from "path";

const issues = JSON.parse(fs.readFileSync("research/reports/screamingfrog_deep_audit.json", "utf8"));
const canonicals = issues.canonicalMismatch || [];

console.log(`=== CANONICAL TAG AUDIT (${canonicals.length} items) ===`);

const sample = canonicals.slice(0, 20);
sample.forEach((item, i) => {
  console.log(`[${i + 1}] URL: ${item.url}`);
  console.log(`     Canonical: ${item.canonical}`);
});
