import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { log, callLLM, ensureDir } from "./lib/shared.mjs";
import { writeGoal, writeWeeklyGoal, appendToReport, getReportPath } from "./lib/report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const ARTICLES_DIR = path.resolve(__dirname, "../../src/content/articles");
const REPORTS_DIR = path.resolve(__dirname, "../reports");
const STATE_FILE = path.join(__dirname, "state.json");
const ALL_PILLARS = ["ai-tools","ai-workflows","productivity","windows-fixes","android-fixes","career-growth","automation","privacy","security","free-software"];

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
    if (!fs.existsSync(gcpKey)) issues.push("GCP service account key missing — GSC submissions disabled");
  } catch (err) {
    issues.push(`Health check error: ${err.message}`);
  }
  const allOk = issues.length === 0;
  return { allOk, issues };
}

// ─── Marketing Analysis ─────────────────────────────────────────────────────

export async function runMarketing() {
  log("[Marketing Agent] Starting daily analysis — GOING HARD...");

  const allArticles = fs.existsSync(ARTICLES_DIR)
    ? fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx"))
    : [];
  const totalArticles = allArticles.length;
  const state = loadState();

  // Score last 5 articles
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

  // Check pillar distribution
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

  // Competitor trends
  let competitorNote = "";
  try {
    const url = "https://news.google.com/rss/search?q=tech+tips+guide+how+to+2026+AI+privacy+productivity+Windows+Android&hl=en-US&gl=US&ceid=US:en";
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const xml = await res.text();
    const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1, 6).map((m) => m[1]);
    competitorNote = titles.length ? `Hot competitors: ${titles.slice(0, 3).join("; ")}` : "";
  } catch { /* skip */ }

  // ─── HARD DAILY GOALS ──────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const syndicatedCount = state.syndicated?.length || 0;
  const pillarGapStr = weakPillars.length ? weakPillars.join(", ") : "none";

  const goals = [
    `PUBLISH: Hit daily quota of 5 articles — ${state.articlesPublishedToday || 0}/5 done so far`,
    `QUALITY: Every new article must score >= 8/10 (current rolling avg: ${qualityScore}/10)`,
    `WINDOWS PRIORITY: Focus all writing on Windows troubleshooting + system repair — maximum CTR potential`,
    `SYNDICATION: Push every new article to Dev.to + LinkedIn + Medium within 1 hour of publish`,
    `INDEXING: Submit sitemap to GSC + ping IndexNow for every new article (ensure < 1h to indexed)`,
    `BACKLINKS: Find and catalog 5+ guest post / resource page opportunities daily`,
    `COMPETE: Ensure our last 3 articles beat competitors on word count (1800+ words) + depth`,
    `NO ZERO-CLICK: Every article gets a strong socialHook + meta description for CTR`,
  ];
  if (competitorNote) goals.push(`INTEL: ${competitorNote} — we need to match or out-cover these`);
  if (weakPillars.length > 0 && !weakPillars.includes("windows-fixes")) goals.push(`NOTE: Non-Windows pillars can wait — focus on Windows troubleshooting for now`);

  // HARD weekly goals
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStr = weekStart.toISOString().split("T")[0];

  const weeklyHardGoals = [
    "PUBLISH 15+ Windows troubleshooting articles this week (pillar balance suspended)",
    "SYNDICATE every article to Dev.to, LinkedIn, and Medium within 1h of publish",
    "ACHIEVE avg quality score >= 8 across all new articles this week",
    "FOCUS exclusively on Windows fixes — do not write non-Windows content this week",
    "SUBMIT sitemap to GSC daily via API",
    "DISCOVER and outreach to 10+ guest post / resource page opportunities",
    "ENSURE every article passes quality gates with score >= 75/100",
    "BUILD 3+ backlinks from guest posts or resource pages",
  ];

  // ─── WRITE GOALS ───────────────────────────────────────────────────────
  const goalContent = [
    `# 🚀 HARD MARKETING GOALS — ${today}`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Total articles on site:** ${totalArticles}`,
    `**Published today:** ${state.articlesPublishedToday || 0}`,
    `**Syndicated total:** ${syndicatedCount}`,
    `**Quality score avg:** ${qualityScore}/10`,
    `**Pillars with 0 content:** ${weakPillars.length || "none"}`,
    `**System health:** ${(await runSystemHealth()).allOk ? "ALL OK" : "ISSUES FOUND — see below"}`,
    "",
    "## 🔴 HARD DAILY GOALS (non-negotiable)",
    ...goals.map((g, i) => `- [ ] **${i + 1}.** ${g}`),
    "",
    "## Pillar Distribution (current)",
    ...Object.entries(pillarCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([p, c]) => `- ${p}: ${c} articles (${(c / totalArticles * 100).toFixed(0)}%)`),
    "",
    "## 🆘 Pillars at Zero — Must Fix",
    weakPillars.length
      ? weakPillars.map((p) => `- [ ] **${p}** — create 1 article this week`).join("\n")
      : "All 10 pillars have content ✅",
    "",
    "## Competitor Intelligence",
    competitorNote || "Unable to fetch — check Google News RSS",
    "",
    "---",
    "*Auto-generated by Marketing Agent (hard mode)*",
  ].join("\n");

  // Write to all accessible locations
  ensureDir(DAILY_GOALS_DIR);
  ensureDir(WEEKLY_GOALS_DIR);
  writeGoal(today, goalContent);

  const weeklyContent = [
    `# 🚀 HARD WEEKLY GOALS — Week of ${weekStr}`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Total articles:** ${totalArticles}`,
    `**Week start:** ${weekStr}`,
    "",
    "## This Week's Hard Targets",
    ...weeklyHardGoals.map((g, i) => `- [ ] **${i + 1}.** ${g}`),
    "",
    `## Weak Pillars (needing content this week): ${pillarGapStr}`,
    "",
    "*Auto-generated by Marketing Agent (hard mode)*",
  ].join("\n");
  writeWeeklyGoal(weekStr, weeklyContent);

  // ─── ALSO WRITE TO BOSS REPORT (so dev-agent reads it) ────────────────
  const improvementLines = goals.map((g) => `- ${g}`);
  appendToReport("Marketing Agent — Hard Goals", [
    `Marketing agent ran at ${new Date().toISOString()}`,
    `**Total articles:** ${totalArticles} | **Quality:** ${qualityScore}/10 | **Syndicated:** ${syndicatedCount}`,
    `**Focus:** Windows troubleshooting (pillar balance suspended for CTR push)`,
    `**System health:** ${(await runSystemHealth()).allOk ? "OK" : "ISSUES"}`,
    "",
    "### Marginal Improvements Needed",
    ...improvementLines,
    "",
    "### Dev Agent: Implement These Now",
    "- If Windows topic available → prioritize generation immediately (highest CTR potential)",
    "- If quality < 8 → increase LLM temperature or add more research context",
    "- If syndication not keeping up → check Dev.to/LinkedIn API keys",
    "- If GSC not pinged → run node seo-agent/gsc-client.mjs ping",
    "",
    "*Auto-pushed by Marketing Agent*",
  ].join("\n"));

  // ─── System Health ─────────────────────────────────────────────────────
  const sysHealth = await runSystemHealth();
  state.lastMarketingDate = today;
  saveState(state);

  log(`[Marketing Agent] HARD GOALS written for ${today}`);
  log(`  Quality: ${qualityScore}/10, Pillar gaps: ${pillarGapStr}`);
  log(`  System: ${sysHealth.allOk ? "ALL OK ✅" : `ISSUES: ${sysHealth.issues.join("; ")}`}`);
  log(`  Goals written to: ${path.join(DAILY_GOALS_DIR, `${today}.md`)} and boss report`);

  return {
    totalArticles,
    qualityScore,
    pillarCounts,
    weakPillars,
    goals,
    competitorNote,
    systemHealth: sysHealth,
  };
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMarketing().catch(console.error);
}
