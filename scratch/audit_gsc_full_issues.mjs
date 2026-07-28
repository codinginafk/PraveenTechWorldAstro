import fs from "fs";
import path from "path";

const gscReportPath = "research/agents/temp-gsc-report.json";
const analyticsPath = "research/agents/analytics-data.json";
const vercelJsonPath = "vercel.json";

console.log("=== FULL GSC & ANALYTICS AUDIT SCRIPT ===");

const gscData = JSON.parse(fs.readFileSync(gscReportPath, "utf8"));
const analyticsData = JSON.parse(fs.readFileSync(analyticsPath, "utf8"));
const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, "utf8"));

const existingRedirects = vercelConfig.redirects || [];
const redirectSources = new Set(existingRedirects.map(r => r.source));

// Check page-level data from analytics
console.log("\n--- ANALYTICS PAGE URL AUDIT ---");
const pageList = analyticsData.gscData || [];

const issues = {
  highImpressionsZeroClicks: [],
  deepPagePositionNoCTR: [],
  missingOrBrokenUrls: [],
  legacyUrlPatterns: []
};

for (const entry of pageList) {
  const url = entry.keys[0];
  const clicks = entry.clicks || 0;
  const impressions = entry.impressions || 0;
  const position = entry.position || 0;

  let pathname = "";
  try {
    const parsed = new URL(url);
    pathname = parsed.pathname;
  } catch {
    pathname = url;
  }

  // Check if page URL has legacy patterns (e.g. .html or /2026/01/)
  if (/\.html$|^\/\d{4}\/\d{2}\//.test(pathname)) {
    issues.legacyUrlPatterns.push({ url, pathname, impressions, clicks, position });
  }

  // High impression near miss
  if (impressions >= 15 && clicks === 0 && position <= 20) {
    issues.highImpressionsZeroClicks.push({ url, pathname, impressions, clicks, position: position.toFixed(1) });
  }
}

console.log(`\nFound ${issues.legacyUrlPatterns.length} Legacy URL Patterns`);
console.log(`Found ${issues.highImpressionsZeroClicks.length} Near-Miss High Impression / Zero Click Pages`);

// Output details
console.log("\nTop Legacy URL Patterns in GSC:");
issues.legacyUrlPatterns.forEach(item => {
  const hasRedirect = redirectSources.has(item.pathname);
  console.log(`  - ${item.pathname} | Imp: ${item.impressions} | Pos: ${item.position.toFixed(1)} | HasRedirect: ${hasRedirect}`);
});

console.log("\nTop High Impression / Zero Click Pages (Near-Misses):");
issues.highImpressionsZeroClicks.slice(0, 15).forEach(item => {
  console.log(`  - ${item.pathname} | Imp: ${item.impressions} | Pos: ${item.position}`);
});

// Save audit summary artifact
fs.writeFileSync("research/reports/gsc_full_audit_summary.json", JSON.stringify(issues, null, 2));
console.log("\nFull audit output saved to research/reports/gsc_full_audit_summary.json");
