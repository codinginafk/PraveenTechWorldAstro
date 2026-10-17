#!/usr/bin/env node
/**
 * scripts/pipeline_telemetry_audit.mjs
 * =====================================================================
 * Evaluates performance of articles published >3 days ago.
 * Extracts: Impressions, Clicks, CTR, Position, and Winning Queries.
 * Updates docs/pipeline/content-engine-tracker.json with feedback loop data.
 * =====================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const ARTICLES_DIR = path.join(ROOT_DIR, 'src/content/articles');
const TRACKER_FILE = path.join(ROOT_DIR, 'docs/pipeline/content-engine-tracker.json');
const STATUS_MD = path.join(ROOT_DIR, 'docs/pipeline/status.md');
const GSC_RAW_FILE = path.join(ROOT_DIR, 'scratch/forensic_gsc_raw.json');

function parseArticleFrontmatter(content) {
  const match = content.match(/^---([\s\S]*?)---/);
  if (!match) return null;
  const fm = match[1];

  const getField = (key) => {
    const m = fm.match(new RegExp(`^${key}:\\s*["']?([^"\\n]+)["']?`, 'm'));
    return m ? m[1].trim() : '';
  };

  return {
    category: getField('category'),
    tags: getField('tags'),
    title: getField('title'),
    publishDate: getField('publishDate'),
    updatedDate: getField('updatedDate'),
    target_query: getField('target_query'),
    draft: /draft:\s*true/m.test(fm)
  };
}

const args = process.argv.slice(2);
const hubArg = args.find(a => a.startsWith('--hub='));
const targetHub = hubArg ? hubArg.split('=')[1].toLowerCase() : (args.includes('--windows') ? 'windows' : 'all');

async function runAudit() {
  console.log('🔍 Running 3-Day Telemetry Feedback Audit...');

  if (!fs.existsSync(TRACKER_FILE)) {
    console.error(`❌ Tracker file missing at ${TRACKER_FILE}`);
    process.exit(1);
  }

  const tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));

  // Load GSC data
  let pageStats = new Map();
  if (fs.existsSync(GSC_RAW_FILE)) {
    const raw = JSON.parse(fs.readFileSync(GSC_RAW_FILE, 'utf8'));
    const rows = raw.page_query_rows || [];
    for (const r of rows) {
      if (!r.keys || r.keys.length < 2) continue;
      const url = r.keys[0].replace('https://www.praveentechworld.com', '');
      const query = r.keys[1];
      const clicks = r.clicks || 0;
      const impressions = r.impressions || 0;
      const ctr = r.ctr || 0;
      const position = r.position || 0;

      if (!pageStats.has(url)) {
        pageStats.set(url, {
          totalClicks: 0,
          totalImpressions: 0,
          queries: []
        });
      }
      const entry = pageStats.get(url);
      entry.totalClicks += clicks;
      entry.totalImpressions += impressions;
      entry.queries.push({ query, clicks, impressions, ctr, position });
    }
  }

  // Scan all articles
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.mdx'));
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const auditedPosts = [];

  for (const file of files) {
    const fullPath = path.join(ARTICLES_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const fm = parseArticleFrontmatter(content);
    if (!fm || fm.draft) continue;

    if (targetHub === 'windows') {
      const isWindows = fm.category === 'windows-fixes' || 
                        fm.category === 'hardware-troubleshooting' || 
                        /windows|bsod|error|crash|driver|update|dism|wifi|audio|ram|gpu/i.test(file) || 
                        /windows|bsod|error|crash|driver|update|dism|wifi|audio/i.test(fm.title);
      if (!isWindows) continue;
    }

    const pubDateStr = fm.publishDate || fm.updatedDate;
    if (!pubDateStr) continue;

    const pubDate = new Date(pubDateStr);
    if (isNaN(pubDate.getTime()) || pubDate > threeDaysAgo) continue;

    const slug = file.replace(/\.mdx$/, '');
    const urlPath = `/blog/${slug}`;
    const stats = pageStats.get(urlPath) || { totalClicks: 0, totalImpressions: 0, queries: [] };

    // Sort queries by impressions
    stats.queries.sort((a, b) => b.impressions - a.impressions);
    const topQueryObj = stats.queries[0];

    auditedPosts.push({
      slug,
      publishDate: pubDateStr,
      targetQuery: fm.target_query || (topQueryObj ? topQueryObj.query : 'N/A'),
      impressions: stats.totalImpressions,
      clicks: stats.totalClicks,
      ctr: stats.totalImpressions > 0 ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2) + '%' : '0.00%',
      topQuery: topQueryObj ? topQueryObj.query : 'N/A',
      avgPosition: topQueryObj ? topQueryObj.position.toFixed(1) : 'N/A'
    });
  }

  auditedPosts.sort((a, b) => b.impressions - a.impressions);

  console.log(`✅ Analyzed ${auditedPosts.length} articles published >3 days ago.`);
  console.log('Top 5 Performing Posts (>3 Days Old):');
  auditedPosts.slice(0, 5).forEach((p, idx) => {
    console.log(`  ${idx + 1}. [${p.slug}] - ${p.impressions} imp, ${p.clicks} clicks, CTR: ${p.ctr}, Top Query: "${p.topQuery}"`);
  });

  tracker.telemetryLearnings.lastAuditTimestamp = new Date().toISOString();
  tracker.telemetryLearnings.auditedPostCount = auditedPosts.length;
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2), 'utf8');

  console.log('✅ Tracker updated at docs/pipeline/content-engine-tracker.json');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
});
