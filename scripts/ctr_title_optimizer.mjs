#!/usr/bin/env node
/**
 * scripts/ctr_title_optimizer.mjs
 * =====================================================================
 * Automated GSC Striking-Distance & Click-Through Rate (CTR) Title Engine.
 *
 * 1. Analyzes GSC impressions, CTR, and average positions for all articles.
 * 2. Surfaces striking-distance opportunities (Position 4.0 - 20.0, CTR < 2.5%).
 * 3. Audits title length (max 60 chars for SERP), query inclusion, and click hooks.
 * 4. Generates high-converting, search-oriented titles that match user queries.
 * 5. Supports --dry-run (default), --report, and --fix-top <N>.
 * =====================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT_DIR, 'src/content/articles');
const GSC_RAW_FILE = path.join(ROOT_DIR, 'scratch/forensic_gsc_raw.json');
const REPORT_FILE = path.join(ROOT_DIR, 'research/reports/ctr_title_opportunities.json');
const LOG_FILE = path.join(ROOT_DIR, 'runtime/ctr_title_optimizer.log');

const args = process.argv.slice(2);
const isFixMode = args.includes('--fix') || args.some(a => a.startsWith('--fix-top'));
const fixTopArg = args.find(a => a.startsWith('--fix-top='));
const fixTopCount = fixTopArg ? parseInt(fixTopArg.split('=')[1], 10) : (args.includes('--fix') ? 3 : 0);

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [CTR/Optimizer] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch {}
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---([\s\S]*?)---/);
  if (!m) return null;
  const fm = m[1];
  const getField = (k) => {
    const mm = fm.match(new RegExp(`^${k}:\\s*["']?([^"\\n]+)["']?`, 'm'));
    return mm ? mm[1].trim() : '';
  };
  return {
    rawHeader: m[0],
    fmBlock: fm,
    title: getField('title'),
    seoTitle: getField('seoTitle'),
    description: getField('description'),
    target_query: getField('target_query'),
    category: getField('category'),
    draft: /draft:\s*true/m.test(fm),
    publishDate: getField('publishDate'),
    updatedDate: getField('updatedDate')
  };
}

function loadGscData() {
  if (!fs.existsSync(GSC_RAW_FILE)) {
    log(`⚠️ GSC data file not found at ${GSC_RAW_FILE}. Running in heuristic mode.`);
    return { pageQueryMap: new Map(), pagesMap: new Map() };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(GSC_RAW_FILE, 'utf8'));
    const rows = raw.page_query_rows || [];
    const pageQueryMap = new Map();

    for (const r of rows) {
      if (!r.keys || r.keys.length < 2) continue;
      const url = r.keys[0].replace('https://www.praveentechworld.com', '');
      const query = r.keys[1];
      if (!pageQueryMap.has(url)) pageQueryMap.set(url, []);
      pageQueryMap.get(url).push({
        query,
        impressions: Number(r.impressions) || 0,
        clicks: Number(r.clicks) || 0,
        ctr: Number(r.ctr) || 0,
        position: Number(r.position) || 0
      });
    }

    return { pageQueryMap, pagesMap: raw.pages || {} };
  } catch (err) {
    log(`❌ Error reading GSC data: ${err.message}`);
    return { pageQueryMap: new Map(), pagesMap: new Map() };
  }
}

function generateOptimizedTitle(currentTitle, topQuery, category) {
  if (!topQuery) return currentTitle;

  // Clean top query capitalization
  const capitalize = (s) => s.split(' ').map(w => {
    const lower = w.toLowerCase();
    if (['and', 'or', 'in', 'on', 'at', 'to', 'for', 'a', 'an', 'the', 'vs', 'of'].includes(lower)) return lower;
    if (['ai', 'pc', 'ram', 'gpu', 'bsod', 'cpu', 'nvme', 'ssd', 'wsl2', 'gsc', 'ga4'].includes(lower)) return lower.toUpperCase();
    if (/^kb\d+/i.test(lower)) return lower.toUpperCase();
    if (/^0x[0-9a-f]+/i.test(lower)) return lower.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');

  let cleanQuery = capitalize(topQuery.trim());
  let candidate = '';

  // 1. Error Code / Update / Driver Crash queries (e.g. "kb5121003", "0x8024200d", "nvlddmkm")
  if (/^(KB\d+|0x[0-9a-f]+|nvlddmkm)/i.test(cleanQuery)) {
    if (/^KB\d+/i.test(cleanQuery)) {
      candidate = `${cleanQuery} Crash Fix: Tested Solutions for Windows 11`;
    } else if (/^0x/i.test(cleanQuery)) {
      candidate = `Fix Windows Update Error ${cleanQuery}: Step-by-Step`;
    } else if (/nvlddmkm/i.test(cleanQuery)) {
      candidate = `Fix ${cleanQuery} Event ID 13: Tested NVIDIA GPU Crash Fix`;
    }
  }
  // 2. Comparison / Pricing / Software List queries (e.g. "best business password managers 2026 pricing")
  else if (/pricing|cost|rates/i.test(cleanQuery)) {
    candidate = `${cleanQuery}: Tested Rates & Features`;
    if (candidate.length > 60) candidate = `${cleanQuery}: Rates Compared`;
  } else if (/^(best|top)\s+/i.test(cleanQuery)) {
    candidate = `${cleanQuery} (Tested & Ranked)`;
    if (candidate.length > 60) candidate = `${cleanQuery}: Tested Guide`;
  } else if (/\bvs\b/i.test(cleanQuery)) {
    candidate = `${cleanQuery}: Tested Benchmark Results`;
    if (candidate.length > 60) candidate = `${cleanQuery}: Hands-On Test`;
  }
  // 3. Question / Verification Queries (e.g. "does reinstalling windows remove viruses")
  else if (/^(does|will|can|is|why)\s+/i.test(cleanQuery)) {
    const qMark = cleanQuery.endsWith('?') ? '' : '?';
    const base = `${cleanQuery}${qMark}`;
    if (`${base} What Actually Survives`.length <= 60) {
      candidate = `${base} What Actually Survives`;
    } else if (`${base} Tested Results`.length <= 60) {
      candidate = `${base} Tested Results`;
    } else if (`${base} Real Test`.length <= 60) {
      candidate = `${base} Real Test`;
    } else {
      candidate = base;
    }
  }
  // 4. Troubleshooting / Fix Queries
  else if (/not working|crash|error|failed|stuck|fix/i.test(cleanQuery)) {
    if (/^windows 11 volume control/i.test(cleanQuery)) {
      candidate = `Windows 11 Volume Control Not Working: 5-Second Fix`;
    } else if (!/fix/i.test(cleanQuery)) {
      candidate = `${cleanQuery}: Tested Fix Guide`;
    } else {
      candidate = `${cleanQuery} (Tested Solutions)`;
    }
  }
  // 5. How-To / Setup Guides
  else if (/^(how to|guide|setup|install|run)/i.test(cleanQuery)) {
    candidate = `${cleanQuery}: Step-by-Step Guide`;
  } else {
    candidate = `${cleanQuery}: Tested Guide (2026)`;
  }

  // Strict SERP 60-char truncation check
  if (candidate.length > 60) {
    if (candidate.includes(':')) {
      const [head] = candidate.split(':');
      if (`${head}: Tested Guide`.length <= 60) candidate = `${head}: Tested Guide`;
      else if (`${head}: Fix`.length <= 60) candidate = `${head}: Fix`;
      else candidate = head.slice(0, 60);
    } else if (candidate.includes('?')) {
      const [head] = candidate.split('?');
      candidate = `${head.slice(0, 58)}?`;
    } else {
      candidate = candidate.slice(0, 60).replace(/\s+\S*$/, '');
    }
  }

  return candidate;
}

function runAudit() {
  log(`Starting 30-minute CTR & Title Ranking Audit...`);
  const { pageQueryMap } = loadGscData();
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.mdx'));
  log(`Loaded ${files.length} article files.`);

  const opportunities = [];

  for (const file of files) {
    const fullPath = path.join(ARTICLES_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm || fm.draft) continue;

    const slug = file.replace('.mdx', '');
    const url = `/blog/${slug}`;
    const queries = pageQueryMap.get(url) || [];

    // Aggregate metrics
    let totalImpr = 0;
    let totalClicks = 0;
    let weightedPos = 0;

    for (const q of queries) {
      totalImpr += q.impressions;
      totalClicks += q.clicks;
      weightedPos += q.position * q.impressions;
    }

    const avgPos = totalImpr > 0 ? (weightedPos / totalImpr) : 99;
    const overallCtr = totalImpr > 0 ? (totalClicks / totalImpr) : 0;

    // Filter striking distance: Pos 4.0 - 25.0, Impr >= 80, CTR < 2.5%
    const isStrikingDistance = avgPos >= 4.0 && avgPos <= 25.0 && totalImpr >= 80 && overallCtr < 0.025;

    // Title checks
    const effectiveTitle = fm.seoTitle || fm.title;
    const titleLength = effectiveTitle.length;
    const isTooLong = titleLength > 60;
    const isTooShort = titleLength < 30;

    const topQuery = queries.sort((a,b) => b.impressions - a.impressions)[0]?.query || fm.target_query || '';
    const hasQueryInTitle = topQuery ? effectiveTitle.toLowerCase().includes(topQuery.toLowerCase().slice(0, 15)) : true;

    if (isStrikingDistance || isTooLong || !hasQueryInTitle) {
      const suggestedTitle = generateOptimizedTitle(effectiveTitle, topQuery, fm.category);
      const score = Math.round((totalImpr * (1 - overallCtr)) / Math.sqrt(Math.max(avgPos, 1)));

      opportunities.push({
        file,
        slug,
        currentTitle: effectiveTitle,
        suggestedTitle,
        titleLength,
        suggestedLength: suggestedTitle.length,
        topQuery,
        impressions: totalImpr,
        clicks: totalClicks,
        ctr: (overallCtr * 100).toFixed(2) + '%',
        position: avgPos.toFixed(1),
        score,
        issues: [
          ...(isTooLong ? ['Title > 60 chars (SERP truncation)'] : []),
          ...(isTooShort ? ['Title < 30 chars'] : []),
          ...(!hasQueryInTitle && topQuery ? [`Missing top query: "${topQuery}"`] : []),
          ...(isStrikingDistance ? ['Striking distance (high impr, low CTR)'] : [])
        ]
      });
    }
  }

  // Sort by highest opportunity score
  opportunities.sort((a, b) => b.score - a.score);

  log(`Identified ${opportunities.length} title optimization opportunities.`);

  // Write detailed report
  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalAnalyzed: files.length,
    opportunitiesCount: opportunities.length,
    topOpportunities: opportunities
  }, null, 2), 'utf8');

  // Display top 10
  console.log('\n========================================================================================');
  console.log('🏆 TOP STRIKING-DISTANCE TITLE OPTIMIZATION OPPORTUNITIES');
  console.log('========================================================================================');
  const preview = opportunities.slice(0, 10);
  for (let i = 0; i < preview.length; i++) {
    const opp = preview[i];
    console.log(`\n#${i + 1} [Score: ${opp.score}] ${opp.file}`);
    console.log(`   Current (${opp.titleLength} chars): "${opp.currentTitle}"`);
    console.log(`   Proposed (${opp.suggestedLength} chars): "${opp.suggestedTitle}"`);
    console.log(`   Metrics: ${opp.impressions} Impr | ${opp.clicks} Clicks | ${opp.ctr} CTR | Pos ${opp.position}`);
    console.log(`   Top Query: "${opp.topQuery}"`);
    console.log(`   Issues: ${opp.issues.join('; ')}`);
  }
  console.log('\n========================================================================================');

  // If fix mode enabled, apply top N
  if (isFixMode && fixTopCount > 0) {
    log(`Applying automated title optimizations to top ${fixTopCount} articles...`);
    let appliedCount = 0;
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < Math.min(fixTopCount, opportunities.length); i++) {
      const opp = opportunities[i];
      if (opp.currentTitle === opp.suggestedTitle) continue;

      const fullPath = path.join(ARTICLES_DIR, opp.file);
      let content = fs.readFileSync(fullPath, 'utf8');

      // Update seoTitle and title in frontmatter
      content = content.replace(/^seoTitle:\s*["'][^"'\n]+["']/m, `seoTitle: "${opp.suggestedTitle}"`);
      content = content.replace(/^title:\s*["'][^"'\n]+["']/m, `title: "${opp.suggestedTitle}"`);
      if (!/updatedDate:/m.test(content)) {
        content = content.replace(/^publishDate:\s*["']?([^"'\n]+)["']?/m, `publishDate: "$1"\nupdatedDate: "${today}"`);
      } else {
        content = content.replace(/^updatedDate:\s*["']?[^"'\n]+["']?/m, `updatedDate: "${today}"`);
      }

      fs.writeFileSync(fullPath, content, 'utf8');
      log(`✅ Updated ${opp.file} -> "${opp.suggestedTitle}" (${opp.suggestedLength} chars)`);
      appliedCount++;
    }

    log(`Successfully optimized ${appliedCount} titles.`);
  }

  log(`Audit complete. Report saved to ${REPORT_FILE}.`);
}

runAudit();
