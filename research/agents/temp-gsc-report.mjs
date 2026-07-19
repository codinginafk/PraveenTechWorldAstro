import fs from "fs";
import { getGscPerformance, checkUrlIndexed } from "./seo-agent/gsc-client.mjs";

// 1. Performance data (last 7 days)
console.log("=== GSC Performance (Last 7 Days) ===");
const perf = await getGscPerformance(7);
if (perf && perf.rows.length > 0) {
  let totalClicks = 0, totalImpressions = 0;
  for (const row of perf.rows) {
    totalClicks += row.clicks;
    totalImpressions += row.impressions;
    console.log(`  ${row.clicks} clicks, ${row.impressions} imp, ${(row.ctr * 100).toFixed(1)}% CTR, pos ${row.position.toFixed(1)} — ${row.keys[0]}`);
  }
  console.log(`\n  Total: ${totalClicks} clicks, ${totalImpressions} impressions`);
} else {
  console.log("  No data yet.");
}

// 2. Check some key URLs
console.log("\n=== URL Indexing Status ===");
const urls = [
  "/",
  "/articles/building-a-cli-tool-to-automate-spreadsheet-data-cleaning-with-deepseek",
  "/articles/breaking-the-ai-chatbox-berkeley-students-build-autonomous-agents",
  "/articles/non-developer-built-database-audit-script-with-deepseek",
  "/sitemap-index.xml",
];
for (const u of urls) {
  const result = await checkUrlIndexed(u);
  console.log(`  ${u}: ${result.indexed === true ? "INDEXED" : result.indexed === false ? "NOT INDEXED" : result.error || "UNKNOWN"} ${result.coverageState ? "- " + result.coverageState : ""}`);
}

fs.rmSync(new URL(import.meta.url).pathname);
