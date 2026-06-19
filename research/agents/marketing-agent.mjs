import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log, callLLM, ensureDir } from "./lib/shared.mjs";
import { writeGoal, writeWeeklyGoal, appendToReport, getReportPath } from "./lib/report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const ARTICLES_DIR = path.resolve(__dirname, "../../src/content/articles");
const REPORTS_DIR = path.resolve(__dirname, "../reports");
const STATE_FILE = path.join(__dirname, "state.json");
const ANALYTICS_FILE = path.join(__dirname, "analytics-data.json");
const ALL_PILLARS = ["website-setup","windows-fixes","hosting-infra","ai-websites"];

const GOALS_DIR = path.join(REPORTS_DIR, "goals");
const DAILY_GOALS_DIR = path.join(GOALS_DIR, "daily");
const WEEKLY_GOALS_DIR = path.join(GOALS_DIR, "weekly");

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")); }
  catch { return {}; }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function loadAnalytics() {
  try { return JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf-8")); }
  catch { return null; }
}

async function runSystemHealth() {
  const issues = [];
  try {
    const state = loadState();
    if (!state.lastPublishDate) issues.push("No articles published yet");
    const now = Date.now();
    if (state.lastPublishDate && (now - new Date(state.lastPublishDate).getTime()) > 86400000)
      issues.push("No article published in the last 24 hours");
    if (!fs.existsSync(ARTICLES_DIR) || fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx")).length === 0)
      issues.push("No articles in content directory");
    const gcpKey = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(ROOT_DIR, "gcp-service-account.json");
    if (!fs.existsSync(gcpKey)) issues.push("GCP service account key missing");
  } catch (err) {
    issues.push(`Health check error: ${err.message}`);
  }
  const allOk = issues.length === 0;
  return { allOk, issues };
}

// Read article frontmatter
function readArticleFrontmatter(file) {
  try {
    const c = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf-8");
    const fm = c.match(/---([\s\S]*?)---/)?.[1] || "";
    return {
      title: fm.match(/title:\s*"(.+?)"/)?.[1] || "",
      description: fm.match(/description:\s*"(.+?)"/)?.[1] || "",
      seoTitle: fm.match(/seoTitle:\s*"(.+?)"/)?.[1] || "",
      socialHook: fm.match(/socialHook:\s*"(.+?)"/)?.[1] || "",
      category: fm.match(/category:\s*(\S+)/)?.[1]?.replace(/^"/,"").replace(/"$/,"") || "",
      tags: [...fm.matchAll(/^\s*-\s*(.+)$/gm)]?.filter(m => !m[0].startsWith("---")).map(m => m[1].replace(/"/g,"")) || [],
    };
  } catch { return null; }
}

// ─── Marketing Analysis ─────────────────────────────────────────────────────

export async function runMarketing() {
  log("[Marketing Agent] Starting daily analysis...");

  const allArticles = fs.existsSync(ARTICLES_DIR)
    ? fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx"))
    : [];
  const totalArticles = allArticles.length;
  const state = loadState();
  const analytics = loadAnalytics();

  // ────────────────────────────────────────────────────────────────────────
  // 1. Gather GSC performance data for every article
  // ────────────────────────────────────────────────────────────────────────
  const gscMap = {};
  let totalImpressions = 0;
  let totalClicks = 0;
  if (analytics?.gscData) {
    for (const row of analytics.gscData) {
      const url = row.keys?.[0] || "";
      const slug = url.replace(/https:\/\/[^\/]+\/blog\//, "").replace(/https:\/\/[^\/]+/, "/");
      gscMap[slug] = { clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0 };
      if (slug.startsWith("/blog/")) {
        totalImpressions += row.impressions || 0;
        totalClicks += row.clicks || 0;
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // 2. Identity articles with GSC data — find zero-click articles
  // ────────────────────────────────────────────────────────────────────────
  const articlePerformances = [];
  const zeroClickArticles = [];
  const articlesWithClicks = [];

  for (const file of allArticles) {
    const fm = readArticleFrontmatter(file);
    const slug = file.replace(/\.mdx$/, "");
    const perf = gscMap[slug] || gscMap[`/blog/${slug}`] || null;
    if (perf) {
      articlePerformances.push({ file, title: fm?.title || slug, slug, ...perf });
      if (perf.clicks === 0 && perf.impressions > 0) {
        zeroClickArticles.push({ file, title: fm?.title || slug, slug, impressions: perf.impressions, position: perf.position });
      }
      if (perf.clicks > 0) {
        articlesWithClicks.push({ file, title: fm?.title || slug, slug, clicks: perf.clicks, ctr: perf.ctr });
      }
    }
  }

  // Sort zero-click by impressions descending (biggest missed opportunity first)
  zeroClickArticles.sort((a, b) => b.impressions - a.impressions);

  // ────────────────────────────────────────────────────────────────────────
  // 3. Score last 5 articles (using LLM)
  // ────────────────────────────────────────────────────────────────────────
  const last5 = allArticles.sort().reverse().slice(0, 5);
  let qualityScore = 7;
  if (last5.length > 0) {
    try {
      const samples = last5.map((f) => {
        const c = fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8");
        const fm = c.match(/---([\s\S]*?)---/)?.[1] || "";
        return { file: f, title: fm.match(/title:\s*"(.+?)"/)?.[1] || f };
      });
      const sysPrompt = "You are a content quality analyst. Score the following article titles on a scale of 1-10 based on clickworthiness, SEO value, and question-answering potential. Return only a single number.";
      const userPrompt = `Rate these article titles:\n${samples.map((s, i) => `${i + 1}. ${s.title}`).join("\n")}`;
      const result = await callLLM(sysPrompt, userPrompt, { temperature: 0.3, maxTokens: 256 });
      qualityScore = parseInt(result.trim()) || 7;
    } catch { /* keep default */ }
  }

  // ────────────────────────────────────────────────────────────────────────
  // 4. Check pillar distribution
  // ────────────────────────────────────────────────────────────────────────
  const pillarCounts = {};
  for (const f of allArticles) {
    const c = fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8");
    const match = c.match(/category:\s*(\S+)/);
    if (match) {
      let cat = match[1].replace(/^"/, "").replace(/"$/, "");
      pillarCounts[cat] = (pillarCounts[cat] || 0) + 1;
    }
  }
  const weakPillars = ALL_PILLARS.filter((p) => !pillarCounts[p] && allArticles.length > 0);

  // ────────────────────────────────────────────────────────────────────────
  // 5. Generate engagement-focused recommendations from GSC data
  // ────────────────────────────────────────────────────────────────────────
  const recommendations = [];

  // 5a: Articles with high impressions but zero clicks → need title/description rewrite
  const topZeroClick = zeroClickArticles.slice(0, 5);
  if (topZeroClick.length > 0) {
    recommendations.push("ZERO-CLICK FIXES NEEDED:");
    for (const a of topZeroClick) {
      recommendations.push(`  - "${a.title}" has ${a.impressions} impressions at position ${a.position.toFixed(0)} with 0 clicks. Rewrite meta description + title for CTR.`);
    }
  }

  // 5b: Overall site stats
  const siteCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";
  recommendations.push(`SITE CTR: ${siteCTR}% (${totalClicks} clicks / ${totalImpressions} impressions)`);
  if (parseFloat(siteCTR) < 2) {
    recommendations.push("  CRITICAL: Site CTR is below 2%. Every article needs a rewritten meta description with a clear value proposition and CTA.");
  }

  // 5c: Best performing articles — analyse what works
  if (articlesWithClicks.length > 0) {
    const best = articlesWithClicks.sort((a, b) => b.ctr - a.ctr)[0];
    recommendations.push(`BEST CTR: "${best.title}" — ${(best.ctr * 100).toFixed(1)}% CTR. Analyze what this article's title/description does differently.`);
  } else {
    recommendations.push("CRITICAL: Zero articles have generated a single click from search. Every article needs a full title + description rewrite.");
  }

  // 5d: Syndication engagement
  const linkedInCount = state.linkedInPostLog?.filter(p => p.status === "published")?.length || 0;
  const bufferCount = state.bufferPostLog?.length || 0;
  const bloggerCount = state.bloggerPostLog?.length || 0;
  recommendations.push(`SYNDICATION: LinkedIn=${linkedInCount}, Buffer=${bufferCount}, Blogger=${bloggerCount}, Dev.to=${(state.devtoPosts?.length || 0)}`);
  recommendations.push("  Posts are broadcasts. Start conversations: reply to every comment, ask questions in posts, tag relevant people.");

  // 5e: Content gap — articles with position < 20 that get zero clicks
  const closeButNoCigar = zeroClickArticles.filter(a => a.position < 20);
  if (closeButNoCigar.length > 0) {
    recommendations.push("CLOSE RANKERS (position < 20, 0 clicks): These are the LOWEST HANGING FRUIT.");
    for (const a of closeButNoCigar) {
      recommendations.push(`  - "${a.title}" at position ${a.position.toFixed(0)} — update meta description with compelling value prop`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // 6. Generate platform-specific social content for best/worst performing article
  // ────────────────────────────────────────────────────────────────────────
  let bestCandidateTitle = "";
  let bestCandidateSlug = "";
  if (zeroClickArticles.length > 0) {
    const target = zeroClickArticles[0];
    bestCandidateTitle = target.title;
    bestCandidateSlug = target.slug;
  }

  // Write engagement-focused recommendations to the daily report
  const today = new Date().toISOString().split("T")[0];
  const syndicatedCount = state.syndicated?.length || 0;

  const goals = [
    `ZERO-CLICK AUDIT: ${zeroClickArticles.length} articles have impressions but 0 clicks. Fix has highest ROI.`,
    `TOP FIX: "${zeroClickArticles[0]?.title}" (${zeroClickArticles[0]?.impressions} impressions, ${zeroClickArticles[0]?.position}) — rewrite description NOW`,
    `SITE CTR: ${siteCTR}% — target is 3%+. Every article needs a new meta description.`,
    `LINKEDIN: Stop generic posts. Start with an engineering problem, share a specific config, end with a question.`,
    `TWITTER/X: Use Buffer to post 2x/day. Don't just link-drop — share a tip from the article.`,
    `ENGAGEMENT: Reply to every comment within 2 hours. Ask questions in your own posts.`,
    `BACKLINKS: Guest post on 1 tech site this week — one quality backlink beats 10 more articles.`,
  ];

  // Write a focused action plan
  const goalContent = [
    `# Marketing Action Plan — ${today}`,
    `**Site CTR:** ${siteCTR}% (${totalClicks} clicks / ${totalImpressions} impressions)`,
    `**Total articles:** ${totalArticles} | **Syndicated:** ${syndicatedCount}`,
    `**Zero-click articles:** ${zeroClickArticles.length}`,
    `**Articles with any clicks:** ${articlesWithClicks.length}`,
    "",
    ...recommendations,
    "",
    "## Immediate Actions (today)",
    ...goals.map((g, i) => `- [ ] ${g}`),
    "",
    "## Pillar Distribution",
    ...Object.entries(pillarCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([p, c]) => `- ${p}: ${c} articles`),
    "",
    weakPillars.length ? `## Missing Pillars\n${weakPillars.map(p => `- [ ] **${p}**`).join("\n")}` : "",
  ].filter(Boolean).join("\n");

  ensureDir(DAILY_GOALS_DIR);
  ensureDir(WEEKLY_GOALS_DIR);
  writeGoal(today, goalContent);

  // Write to boss report so dev-agent reads it
  appendToReport("Marketing Agent — Engagement Analysis", [
    `Marketing agent ran at ${new Date().toISOString()}`,
    `**Site CTR:** ${siteCTR}% (${totalClicks}/${totalImpressions})`,
    `**Zero-click articles:** ${zeroClickArticles.length}`,
    ...recommendations,
    "",
    "### Dev Agent Actions",
    "- Rewrite meta descriptions for top 5 zero-click articles (highest impressions first)",
    "- Add socialHook with question to engage audience",
    "- If any article has position < 20 with zero clicks → PRIORITY FIX",
  ].join("\n"));

  // ── Update state ──
  state.lastMarketingDate = today;
  saveState(state);

  log(`[Marketing Agent] Analysis complete`);
  log(`  Site CTR: ${siteCTR}% (${totalClicks}/${totalImpressions})`);
  log(`  Zero-click articles: ${zeroClickArticles.length}`);
  log(`  Recommendations: ${recommendations.length}`);

  return {
    totalArticles,
    qualityScore,
    pillarCounts,
    weakPillars,
    zeroClickArticles,
    articlesWithClicks,
    siteCTR: parseFloat(siteCTR),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMarketing().catch(console.error);
}
