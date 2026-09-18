#!/usr/bin/env node
/**
 * scripts/triage_lost_impressions.mjs
 * Systematic GSC cadence triage: Identifies fading Page 1 assets,
 * dropped impressions, and striking-distance opportunities.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const GSC_PATH = path.join(ROOT, 'scratch', 'forensic_gsc_raw.json');
const REPORT_PATH = path.join(ROOT, 'research', 'reports', 'lost_impressions_triage.json');

if (!fs.existsSync(GSC_PATH)) {
  console.error('GSC raw data not found at:', GSC_PATH);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(GSC_PATH, 'utf-8'));
const rows = raw.page_query_rows || [];

const pageAggregates = new Map();

for (const row of rows) {
  const pageUrl = row.keys[0];
  const query = row.keys[1];
  const impressions = Number(row.impressions) || 0;
  const clicks = Number(row.clicks) || 0;
  const position = Number(row.position) || 0;

  if (!pageAggregates.has(pageUrl)) {
    pageAggregates.set(pageUrl, {
      url: pageUrl,
      impressions: 0,
      clicks: 0,
      positionSum: 0,
      queryCount: 0,
      topQueries: [],
    });
  }

  const item = pageAggregates.get(pageUrl);
  item.impressions += impressions;
  item.clicks += clicks;
  item.positionSum += position * impressions;
  item.queryCount += 1;
  item.topQueries.push({ query, impressions, clicks, position });
}

const triageResults = [];

for (const [url, data] of pageAggregates.entries()) {
  const avgPos = data.impressions > 0 ? (data.positionSum / data.impressions) : 0;
  const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;

  data.topQueries.sort((a, b) => b.impressions - a.impressions);

  let status = 'HEALTHY';
  let issue = 'None';
  let priority = 0;

  if (data.impressions >= 1000 && avgPos <= 12 && ctr < 1.0) {
    status = 'CRITICAL_CTR_DEFICIT';
    issue = 'Page 1 or striking position with massive impression volume but sub-1% CTR. Snippet hook or title intent disconnect.';
    priority = 1;
  } else if (data.impressions >= 300 && avgPos <= 10 && ctr < 1.5) {
    status = 'FADING_PAGE_1';
    issue = 'Top 10 ranking asset failing to capture clicks. Needs CTR hook and fast-answer triage box.';
    priority = 2;
  } else if (data.impressions >= 500 && avgPos > 30) {
    status = 'PHANTOM_IMPRESSION_TRAP';
    issue = 'High impressions on Page 4-7. Ranking for accidental head terms with no chance of clicks without dedicated hub or content expansion.';
    priority = 3;
  } else if (avgPos >= 11 && avgPos <= 20 && data.impressions >= 100) {
    status = 'PAGE_2_STRIKING_DISTANCE';
    issue = 'Page 2 asset primed for elevation with 3-5 internal links and schema boost.';
    priority = 4;
  }

  if (status !== 'HEALTHY') {
    triageResults.push({
      url,
      impressions: data.impressions,
      clicks: data.clicks,
      ctr: Number(ctr.toFixed(2)),
      avgPosition: Number(avgPos.toFixed(1)),
      queryCount: data.queryCount,
      status,
      issue,
      priority,
      top3Queries: data.topQueries.slice(0, 3),
    });
  }
}

triageResults.sort((a, b) => a.priority - b.priority || b.impressions - a.impressions);

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify({
  generatedAt: new Date().toISOString(),
  totalTriagedPages: triageResults.length,
  items: triageResults,
}, null, 2), 'utf-8');

console.log(`=== GSC LOST IMPRESSIONS & STRIKING DISTANCE TRIAGE ===`);
console.log(`Found ${triageResults.length} pages requiring systematic intervention:\n`);

for (const item of triageResults.slice(0, 10)) {
  const shortUrl = item.url.replace('https://www.praveentechworld.com', '');
  console.log(`[${item.status}] (Priority ${item.priority}) ${shortUrl}`);
  console.log(`   Impr: ${item.impressions} | Clicks: ${item.clicks} | CTR: ${item.ctr}% | Avg Pos: ${item.avgPosition}`);
  console.log(`   Top Query: "${item.top3Queries[0]?.query || ''}" (${item.top3Queries[0]?.impressions} imp)`);
  console.log(`   Action: ${item.issue}\n`);
}
