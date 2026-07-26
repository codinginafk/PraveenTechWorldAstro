import https from 'https';

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

// Fetch Google Autocomplete Suggestions (Free, Unlimited)
function getGoogleAutocomplete(query) {
  return new Promise((resolve) => {
    const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const suggestions = parsed[1] || [];
          resolve(suggestions);
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

// Score a title candidate against GSC patterns
function scoreTitle(title) {
  let score = 5.0; // Base score
  const matches = [];
  const penalties = [];

  WINNING_PATTERNS.forEach(p => {
    if (p.regex.test(title)) {
      score += p.weight;
      matches.push(`${p.name} (+${p.weight})`);
    }
  });

  PENALTY_PATTERNS.forEach(p => {
    if (p.regex.test(title)) {
      score += p.weight;
      penalties.push(`${p.name} (${p.weight})`);
    }
  });

  // Length check (Optimal title length: 45 - 65 characters)
  if (title.length >= 45 && title.length <= 65) {
    score += 1.0;
    matches.push('Optimal SERP Length 45-65 chars (+1.0)');
  } else if (title.length > 70) {
    score -= 1.5;
    penalties.push(`Too Long: ${title.length} chars (Mobile SERP Truncation) (-1.5)`);
  }

  return { title, score: Math.max(0, Math.min(10, score)).toFixed(1), matches, penalties, charCount: title.length };
}

async function analyzeTopic(topicQuery, titleCandidates = []) {
  console.log(`\n======================================================`);
  console.log(`🔎 TOPIC & TITLE OPTIMIZATION ENGINE: "${topicQuery}"`);
  console.log(`======================================================`);

  // 1. Query Expansion via Google Autocomplete
  const autocomplete = await getGoogleAutocomplete(topicQuery);
  console.log(`\n📍 LIVE GOOGLE SEARCH AUTOCOMPLETE EXTENSIONS (${autocomplete.length} signals):`);
  autocomplete.slice(0, 8).forEach((s, i) => console.log(`   ${i + 1}. "${s}"`));

  // 2. Score Candidates
  if (titleCandidates.length > 0) {
    console.log(`\n📊 CANDIDATE TITLE CTR-PATTERN SCORING MATRIX:`);
    const scored = titleCandidates.map(scoreTitle).sort((a, b) => b.score - a.score);
    
    scored.forEach((item, i) => {
      console.log(`\n--- Candidate #${i + 1} [Score: ${item.score}/10] ---`);
      console.log(`Title: "${item.title}" (${item.charCount} chars)`);
      if (item.matches.length > 0) console.log(`✅ Positive Signals: ${item.matches.join(' | ')}`);
      if (item.penalties.length > 0) console.log(`⚠️ Risk Factors: ${item.penalties.join(' | ')}`);
    });

    console.log(`\n🏆 WINNING TITLE TO SHIP:`);
    console.log(`👉 "${scored[0].title}" [Score: ${scored[0].score}/10]`);
  }
}

// Command-line execution support
const args = process.argv.slice(2);
const defaultTopic = args[0] || 'local seo bur dubai';
const defaultCandidates = args.slice(1).length > 0 ? args.slice(1) : [
  'How I Rank Bur Dubai & Karama Businesses #1 on Google Search',
  'Step-by-Step Local SEO Guide for Dubai Small Businesses (Karama & Bur Dubai Case Study)',
  'Best Local SEO Agency Services in Bur Dubai 2026'
];

analyzeTopic(defaultTopic, defaultCandidates);
