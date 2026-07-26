import fs from 'fs';
import path from 'path';

const ARTICLES_DIR = path.resolve('src/content/articles');

const WINNING_PATTERNS = [
  { name: 'Exact Hex/BSOD Error Code (GSC 12.5% CTR)', regex: /0x[0-9a-fA-F]{3,8}|event\s*id\s*\d+|clock_watchdog_timeout|kmode_exception/i, weight: 3.5 },
  { name: 'Zero-Agency / Direct Practical Hook', regex: /without agency|no retainer|step-by-step|how i|workbench|direct 1-on-1|7 steps|5 steps/i, weight: 3.0 },
  { name: 'Hyper-Local UAE Context', regex: /bur dubai|al karama|dubai|noon|amazon uae/i, weight: 2.5 },
  { name: 'Concrete Number / Specificity', regex: /\b\d+\s*(fixes|steps|tools|ways|seconds|mins|kb)\b/i, weight: 2.0 }
];

const PENALTY_PATTERNS = [
  { name: 'Spammy Broad Head Term (GSC 0% CTR Bot Trap)', regex: /^best\s+.*(managers|tools|software|services)\s+2026$/i, weight: -3.5 },
  { name: 'Vague AI Buzzword / Fluff', regex: /ultimate guide|comprehensive|mastering|unlocking|game-changer|delve/i, weight: -2.5 }
];

function scoreTitle(title) {
  let score = 5.0;
  const matches = [];
  const penalties = [];

  WINNING_PATTERNS.forEach(p => {
    if (p.regex.test(title)) {
      score += p.weight;
      matches.push(p.name);
    }
  });

  PENALTY_PATTERNS.forEach(p => {
    if (p.regex.test(title)) {
      score += p.weight;
      penalties.push(p.name);
    }
  });

  if (title.length >= 45 && title.length <= 65) {
    score += 1.0;
    matches.push('Optimal SERP Length (45-65 chars)');
  } else if (title.length > 70) {
    score -= 1.5;
    penalties.push(`Too Long: ${title.length} chars`);
  }

  return { title, score: Math.max(0, Math.min(10, score)).toFixed(1), matches, penalties, charCount: title.length };
}

const batch1Optimizations = [
  {
    file: 'ai-content-auditor-scored-my-blog-articles.mdx',
    newTitle: 'How I Built an AI Content Auditor to Score My Blog (55/100 Case Study)',
  },
  {
    file: 'ai-in-higher-education-protecting-student-data-privacy-tips.mdx',
    newTitle: '7 Steps to Protect Student Data Privacy in Campus AI (2026 Guide)',
  },
  {
    file: 'ai-powered-expense-report-automation-for-office-workers-no-code-solutions.mdx',
    newTitle: 'How to Automate Expense Reports with AI (No-Code Step-by-Step Guide)',
  },
  {
    file: 'ai-to-automate-office-work-microsoft-ceo-predictions.mdx',
    newTitle: 'How to Prepare for Microsoft AI Office Automation (Step-by-Step)',
  },
  {
    file: 'ai-usage-dropping-math-skills-berkeley-cs-classes.mdx',
    newTitle: 'Why Berkeley CS Classes Banned AI Chatbots (Step-by-Step Study)',
  }
];

function runBatch1() {
  console.log(`\n======================================================`);
  console.log(`🚀 BATCH 1 OPTIMIZATION EXECUTION & GSC PATTERN VERIFICATION`);
  console.log(`======================================================\n`);

  batch1Optimizations.forEach((item, i) => {
    const filePath = path.join(ARTICLES_DIR, item.file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const oldTitleMatch = content.match(/^title:\s*"([^"]+)"/m) || content.match(/^title:\s*'([^']+)'/m);
    const oldTitle = oldTitleMatch ? oldTitleMatch[1] : item.file;
    const oldScored = scoreTitle(oldTitle);
    const newScored = scoreTitle(item.newTitle);

    // Apply frontmatter title update
    content = content.replace(/^title:\s*"[^"]+"/m, `title: "${item.newTitle}"`);
    content = content.replace(/^title:\s*'[^']+'/m, `title: "${item.newTitle}"`);

    fs.writeFileSync(filePath, content, 'utf-8');

    console.log(`[Batch 1 - Article #${i + 1}] ${item.file}`);
    console.log(`   ❌ Old Title: "${oldTitle}" [Score: ${oldScored.score}/10] (${oldTitle.length} chars)`);
    console.log(`   ✅ New Title: "${item.newTitle}" [Score: ${newScored.score}/10] (${item.newTitle.length} chars)`);
    console.log(`   📈 Score Gain: +${(parseFloat(newScored.score) - parseFloat(oldScored.score)).toFixed(1)} pts`);
    console.log(`   💡 Winning Patterns: ${newScored.matches.join(' | ')}\n`);
  });
}

runBatch1();
