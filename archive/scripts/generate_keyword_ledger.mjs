#!/usr/bin/env node
/**
 * scripts/generate_keyword_ledger.mjs
 * Builds the comprehensive Covered vs Uncovered Keyword Ledger.
 * Maps every published article to its target query, discovers accidental queries,
 * and identifies uncovered commercial and technical keywords.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, 'src', 'content', 'articles');
const GSC_PATH = path.join(ROOT, 'scratch', 'forensic_gsc_raw.json');
const LEDGER_PATH = path.join(ROOT, 'research', 'keyword_coverage_ledger.json');

const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.mdx'));
const covered = [];
const targetQuerySet = new Set();

for (const file of files) {
  const fullPath = path.join(ARTICLES_DIR, file);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const { data } = matter(raw);
  const slug = file.replace(/\.mdx$/, '');

  const targetQuery = (data.target_query || data.targetQuery || data.title || '').toLowerCase().trim();
  if (targetQuery) {
    targetQuerySet.add(targetQuery);
  }

  covered.push({
    slug,
    title: data.title || '',
    targetQuery,
    category: data.category || 'tech',
    draft: Boolean(data.draft),
    hasQuickAnswer: Boolean(data.quickAnswer),
    hasFaq: Boolean(data.faq && data.faq.length > 0),
  });
}

// Read GSC queries
const uncovered = [];
if (fs.existsSync(GSC_PATH)) {
  const gscRaw = JSON.parse(fs.readFileSync(GSC_PATH, 'utf-8'));
  const rows = gscRaw.page_query_rows || [];

  const queryAgg = new Map();
  for (const r of rows) {
    const q = (r.keys[1] || '').trim().toLowerCase();
    if (!q) continue;
    if (!queryAgg.has(q)) {
      queryAgg.set(q, {
        query: q,
        impressions: 0,
        clicks: 0,
        pages: new Set(),
        positions: [],
      });
    }
    const item = queryAgg.get(q);
    item.impressions += Number(r.impressions) || 0;
    item.clicks += Number(r.clicks) || 0;
    item.pages.add(r.keys[0].replace('https://www.praveentechworld.com', ''));
    item.positions.push(Number(r.position) || 0);
  }

  for (const [q, data] of queryAgg.entries()) {
    const isTargeted = Array.from(targetQuerySet).some(tq => tq.includes(q) || q.includes(tq));
    const avgPos = data.positions.reduce((a, b) => a + b, 0) / data.positions.length;

    if (!isTargeted && data.impressions >= 15) {
      uncovered.push({
        query: q,
        impressions: data.impressions,
        clicks: data.clicks,
        avgPosition: Number(avgPos.toFixed(1)),
        rankedPages: Array.from(data.pages),
        recommendation: data.impressions >= 100 
          ? 'HIGH_PRIORITY_CANDIDATE_FOR_NEW_TARGET_OR_SECTION' 
          : 'SECONDARY_QUERY_TO_EXPAND_IN_EXISTING_POST',
      });
    }
  }
}

uncovered.sort((a, b) => b.impressions - a.impressions);

const ledger = {
  updatedAt: new Date().toISOString(),
  totalCoveredArticles: covered.length,
  totalUncoveredQueries: uncovered.length,
  coveredKeywords: covered,
  uncoveredOpportunities: uncovered,
};

fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf-8');

console.log(`=== KEYWORD COVERAGE LEDGER GENERATED ===`);
console.log(`Covered Articles: ${covered.length}`);
console.log(`Uncovered GSC Queries (>=15 imp): ${uncovered.length}`);
console.log(`Saved to: ${LEDGER_PATH}`);
