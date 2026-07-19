import fs from "fs";
import { inspectUrl, checkUrlIndexed } from "./seo-agent/gsc-client.mjs";

// Sample 10 articles to confirm pattern
const samples = [
  "/articles/i-automated-tls-renewal-with-deepseek",
  "/articles/preventing-infinite-loops-in-llm-agent-pipelines",
  "/articles/ga4-not-tracking-visitors-12-troubleshooting-steps",
  "/articles/chatgpt-vs-claude-vs-gemini-which-ai-assistant-is-best-in-2026",
  "/articles/how-to-fix-google-indexing-errors-crawled-not-indexed",
  "/articles/backlink-building-guide-for-new-websites-get-your-first-quality-links",
  "/articles/ai-to-automate-office-work-microsoft-ceo-predictions",
  "/articles/chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows",
  "/articles/windows-11-kb5089573-update-errors-slow-internet-fix",
  "/articles/data-protection-for-universities-compliance-and-security-guide",
];

console.log("=== Article Indexing Status (Sample) ===\n");

for (const u of samples) {
  const r = await checkUrlIndexed(u);
  const status = r.indexed === true ? "✅ INDEXED" 
    : r.indexed === false ? "❌ NOT INDEXED" 
    : "⚠️ " + (r.error || "UNKNOWN");
  const detail = r.coverageState || "";
  console.log(`  ${status.padEnd(18)} ${u}`);
  if (detail) console.log(`  ${"".padEnd(18)} ${detail}`);
}

console.log(`\n=== Performance by Page ===`);
const { google } = await import("googleapis");
const ROOT_DIR = ".";
const auth = new google.auth.GoogleAuth({
  keyFile: require('path').resolve('gcp-service-account.json'),
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});
const webmasters = await google.webmasters({ version: "v3", auth });

const endDate = new Date().toISOString().split("T")[0];
const startDate = new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0];

const resp = await webmasters.searchanalytics.query({
  siteUrl: "sc-domain:praveentechworld.com",
  requestBody: { startDate, endDate, dimensions: ["page"], rowLimit: 10 },
});

for (const row of resp.data.rows || []) {
  console.log(`  ${row.clicks} clicks, ${row.impressions} imp — ${row.keys[0]}`);
}

fs.rmSync(new URL(import.meta.url).pathname);
