import fs from 'fs';
import path from 'path';

const ARTICLES_DIR = path.resolve('src/content/articles');

// High-CTR Patterns extracted from GSC Ground Truth Data
const WINNING_PATTERNS = [
  { name: 'Exact Hex/BSOD Error Code (GSC 12.5% CTR)', regex: /0x[0-9a-fA-F]{3,8}|event\s*id\s*\d+|clock_watchdog_timeout|kmode_exception/i, weight: 3.5 },
  { name: 'Zero-Agency / Direct Practical Hook', regex: /without agency|no retainer|step-by-step|how i|workbench|direct 1-on-1/i, weight: 3.0 },
  { name: 'Hyper-Local UAE Context', regex: /bur dubai|al karama|dubai|noon|amazon uae/i, weight: 2.5 },
  { name: 'Concrete Number / Specificity', regex: /\b\d+\s*(fixes|steps|tools|ways|seconds|mins|kb)\b/i, weight: 2.0 }
];

const PENALTY_PATTERNS = [
  { name: 'Spammy Broad Head Term (GSC 0% CTR Bot Trap)', regex: /^best\s+.*(managers|tools|software|services)\s+2026$/i, weight: -3.5 },
  { name: 'Vague AI Buzzword / Fluff', regex: /ultimate guide|comprehensive|mastering|unlocking|game-changer|delve/i, weight: -2.5 }
];

function scoreArticle(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const slug = path.basename(filePath, '.mdx');
  
  // Extract Frontmatter Title
  const titleMatch = content.match(/^title:\s*"([^"]+)"/m) || content.match(/^title:\s*'([^']+)'/m);
  const title = titleMatch ? titleMatch[1] : slug;

  // Extract First Paragraph under H1/Intro
  const body = content.replace(/^---[\s\S]*?---/, '').trim();
  const firstParagraph = body.split(/\n\s*\n/).find(p => p.trim() && !p.startsWith('#')) || '';
  
  // Extract H2 subheadings
  const h2List = [...body.matchAll(/^##\s+(.+)$/gm)].map(m => m[1]);

  let score = 5.0;
  const positiveSignals = [];
  const riskFactors = [];

  WINNING_PATTERNS.forEach(p => {
    if (p.regex.test(title)) {
      score += p.weight;
      positiveSignals.push(`${p.name} (+${p.weight})`);
    }
  });

  PENALTY_PATTERNS.forEach(p => {
    if (p.regex.test(title)) {
      score += p.weight;
      riskFactors.push(`${p.name} (${p.weight})`);
    }
  });

  // SERP Title Length (45-65 chars)
  if (title.length >= 45 && title.length <= 65) {
    score += 1.0;
    positiveSignals.push('Optimal SERP Length (45-65 chars) (+1.0)');
  } else if (title.length > 70) {
    score -= 1.5;
    riskFactors.push(`Title Too Long (${title.length} chars) (-1.5)`);
  }

  // H1 First Paragraph Intent Front-Loading
  const first15Words = firstParagraph.split(/\s+/).slice(0, 15).join(" ");
  if (/0x[0-9a-fA-F]{3,8}|bur dubai|al karama|dubai|it consultant|seo consultant|fix/i.test(first15Words)) {
    score += 1.5;
    positiveSignals.push('First Paragraph Keyword Front-Loaded (+1.5)');
  }

  // H2 Technical Verbatim Check
  if (h2List.some(h2 => /0x[0-9a-fA-F]{3,8}|\d+\.|faq|schema|speed|step-by-step/i.test(h2))) {
    score += 1.0;
    positiveSignals.push('Technical Verbatim / Step H2 Subheadings (+1.0)');
  }

  const finalScore = Math.max(0, Math.min(10, score)).toFixed(1);
  return {
    filePath,
    slug,
    title,
    score: parseFloat(finalScore),
    passed: parseFloat(finalScore) >= 7.0,
    positiveSignals,
    riskFactors
  };
}

async function runAudit() {
  console.log('=== GSC PATTERN & TITLE/H1/H2/SLUG ORCHESTRATION AUDIT ===');
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.mdx'));
  console.log(`Auditing ${files.length} articles in src/content/articles/...\n`);

  const results = files.map(f => scoreArticle(path.join(ARTICLES_DIR, f)));
  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);

  console.log(`------------------------------------------------------`);
  console.log(`📊 SUMMARY RESULTS:`);
  console.log(`   Total Articles: ${files.length}`);
  console.log(`   Passed (Score >= 7.0): ${passed.length} (${((passed.length/files.length)*100).toFixed(1)}%)`);
  console.log(`   Needs Optimization: ${failed.length} (${((failed.length/files.length)*100).toFixed(1)}%)`);
  console.log(`------------------------------------------------------\n`);

  if (failed.length > 0) {
    console.log(`⚠️ TOP ARTICLES NEEDING TITLE & H1/H2 OPTIMIZATION:`);
    failed.slice(0, 10).forEach((item, i) => {
      console.log(`\n[#${i + 1}] Score: ${item.score}/10 | File: ${item.slug}.mdx`);
      console.log(`    Title: "${item.title}"`);
      if (item.riskFactors.length > 0) console.log(`    Risk Factors: ${item.riskFactors.join(' | ')}`);
    });
  }

  const localSeo = results.find(r => r.slug.includes('how-i-rank-bur-dubai'));
  if (localSeo) {
    console.log(`\n🎯 TARGET LOCAL SEO ARTICLE STATUS:`);
    console.log(`   File: ${localSeo.slug}.mdx`);
    console.log(`   Title: "${localSeo.title}"`);
    console.log(`   Score: ${localSeo.score}/10 [Passed: ${localSeo.passed}]`);
    console.log(`   Positive Signals: ${localSeo.positiveSignals.join(' | ')}`);
  }
}

runAudit();
