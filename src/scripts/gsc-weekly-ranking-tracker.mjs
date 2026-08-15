import fs from "fs";
import path from "path";
import { google } from "googleapis";

const ROOT_DIR = process.cwd();
const saPath = path.join(ROOT_DIR, "gcp-service-account.json");
const REPORTS_DIR = path.join(ROOT_DIR, "research/reports");

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

const auth = new google.auth.GoogleAuth({
  keyFile: saPath,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});

const searchconsole = google.searchconsole({ version: "v1", auth: await auth.getClient() });
const siteUrl = "sc-domain:praveentechworld.com";

export async function runWeeklyRankingTracker() {
  console.log("===============================================================");
  console.log("📈 RUNNING AUTOMATED GSC WEEKLY PERFORMANCE & RANKING TRACKER");
  console.log("===============================================================\n");

  const now = new Date();
  const endDate = now.toISOString().split("T")[0];
  const startDate = new Date(now.getTime() - 28 * 86400000).toISOString().split("T")[0];

  // 1. Query Top Pages
  const pageRes = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 50,
    },
  });

  // 2. Query Top Queries (Keywords)
  const queryRes = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: 50,
    },
  });

  const topPages = (pageRes.data.rows || []).map(r => ({
    page: r.keys[0].replace("https://www.praveentechworld.com", ""),
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: (r.ctr * 100).toFixed(1) + "%",
    position: r.position.toFixed(1),
  }));

  const topQueries = (queryRes.data.rows || []).map(r => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: (r.ctr * 100).toFixed(1) + "%",
    position: r.position.toFixed(1),
  }));

  // Striking distance keywords (Positions 11 to 25)
  const strikingDistance = topQueries.filter(q => parseFloat(q.position) >= 10.0 && parseFloat(q.position) <= 25.0);

  const reportMd = [
    "# 📈 PraveenTechWorld Weekly GSC Ranking & Performance Report",
    `**Tracking Period:** ${startDate} to ${endDate} (Last 28 Days)`,
    `**Generated At:** ${now.toISOString()}`,
    "",
    "---",
    "",
    "## 🎯 Top 10 Performing Pages (by Impressions)",
    "",
    "| Page URL | Impressions | Clicks | CTR | Avg Position |",
    "|:---|:---:|:---:|:---:|:---:|",
    ...topPages.slice(0, 15).map(p => `| \`${p.page}\` | **${p.impressions}** | ${p.clicks} | ${p.ctr} | **${p.position}** |`),
    "",
    "---",
    "",
    "## ⚡ Striking Distance Keywords (Page 2 ➔ Page 1 Opportunities)",
    "*Queries ranking between position 10.0 and 25.0 with immediate top-10 breakout potential:*",
    "",
    "| Target Query | Impressions | Clicks | CTR | Current Position |",
    "|:---|:---:|:---:|:---:|:---:|",
    ...strikingDistance.slice(0, 15).map(q => `| **${q.query}** | **${q.impressions}** | ${q.clicks} | ${q.ctr} | **${q.position}** |`),
    "",
    "---",
    "*Automated Weekly GSC Performance Tracker — PraveenTechWorld Growth Engine*"
  ].join("\n");

  const reportPath = path.join(REPORTS_DIR, "weekly-gsc-performance.md");
  fs.writeFileSync(reportPath, reportMd, "utf8");

  console.log(`✅ Weekly GSC Performance Report successfully saved to: ${reportPath}`);
  console.log(`- Top Pages Tracked: ${topPages.length}`);
  console.log(`- Striking Distance Keywords: ${strikingDistance.length}`);
}

runWeeklyRankingTracker().catch(console.error);
