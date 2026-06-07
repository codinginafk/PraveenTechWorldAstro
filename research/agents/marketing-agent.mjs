import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { log, callLLM, ensureDir } from "./lib/shared.mjs";
import { writeGoal, writeWeeklyGoal, appendToReport } from "./lib/report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const RESEARCH_DIR = path.resolve(__dirname, "../research");
const ARTICLES_DIR = path.resolve(__dirname, "../../src/content/articles");
const REPORTS_DIR = path.resolve(__dirname, "../reports");
const STATE_FILE = path.join(__dirname, "state.json");
const ALL_PILLARS = ["ai-tools","ai-workflows","productivity","windows-fixes","android-fixes","career-growth","automation","privacy","security","free-software"];

function normalizeEOL(text) {
  return text.replace(/\r\n/g, "\n");
}

  // ─── Content Performance Analysis ─────────────────────────────────────────────

async function loadAnalyticsData() {
  const analyticsFile = path.join(__dirname, "analytics-data.json");
  if (!fs.existsSync(analyticsFile)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(analyticsFile, "utf-8"));
    return data;
  } catch {
    return null;
  }
}

function findContentGaps(analyticsData) {
  if (!analyticsData?.contentGaps || analyticsData.contentGaps.length === 0) return [];
  return analyticsData.contentGaps.slice(0, 10);
}

function findTopPerformingTopics(analyticsData) {
  if (!analyticsData?.performingArticles?.top) return [];
  return analyticsData.performingArticles.top.slice(0, 5);
}

function findZeroClickArticles(analyticsData) {
  if (!analyticsData?.performingArticles?.zeroClicks) return [];
  return analyticsData.performingArticles.zeroClicks.slice(0, 5);
}

async function fetchCompetitorTrends() {
  try {
    const topics = ["tech tips", "how to", "productivity", "AI", "privacy", "Windows", "Android"];
    const queries = topics.map(t => `https://news.google.com/rss/search?q=${encodeURIComponent(t)}+guide+how+to+2026&hl=en-US&gl=US&ceid=US:en`);
    const allTitles = [];
    for (const url of queries.slice(0, 3)) {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const xml = await res.text();
      const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1, 4).map(m => m[1]);
      allTitles.push(...titles);
    }
    return [...new Set(allTitles)].slice(0, 8);
  } catch {
    return [];
  }
}

async function analyzeHeadlinePotential(titles) {
  try {
    const { callLLM } = await import("./lib/shared.mjs");
    const prompt = `Rate these article titles by clickworthiness (1-10) and suggest a better angle for the lowest-scoring one:\n${titles.map((t, i) => `${i + 1}. "${t}"`).join("\n")}\n\nReturn format: JSON {"scores": [{"title": "...", "score": 8, "suggestion": "..."}]}`;
    const result = await callLLM("You are a content strategist focused on click-through rate optimization.", prompt, { temperature: 0.3, maxTokens: 1024 });
    const parsed = JSON.parse(result.replace(/```json|```/g, "").trim());
    return Array.isArray(parsed?.scores) ? parsed.scores : [];
  } catch {
    return [];
  }
}

// ─── Marketing Analysis ─────────────────────────────────────────────────────

export async function runMarketing() {
  log("[Marketing Agent] Starting daily analysis...");

  const allArticles = fs.existsSync(ARTICLES_DIR)
    ? fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx"))
    : [];
  const totalArticles = allArticles.length;

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

  // Check pillar distribution (dynamic – all 10 pillars)
  const pillarCounts = {};
  for (const f of allArticles) {
    const c = fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8");
    const match = c.match(/category:\s*(\S+)/);
    if (match) {
      let cat = match[1].replace(/^"/, "").replace(/"$/, "");
      pillarCounts[cat] = (pillarCounts[cat] || 0) + 1;
    }
  }
  const gaps = Object.keys(pillarCounts).filter(
    (p) => (pillarCounts[p] / totalArticles) > 0.4
  );
  const weakPillars = ALL_PILLARS.filter((p) => !pillarCounts[p] && allArticles.length > 0);

  // Competitor check
  let competitorNote = "";
  try {
    const url = "https://news.google.com/rss/search?q=tech+tips+guide+how+to+AI+privacy&hl=en-US&gl=US&ceid=US:en";
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const xml = await res.text();
    const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1, 6).map((m) => m[1]);
    competitorNote = titles.length ? `Competitors publishing: ${titles.slice(0, 3).join("; ")}` : "";
  } catch { /* skip */ }

  // Set daily goals
  const today = new Date().toISOString().split("T")[0];
  const goals = [
    `Publish articles: need ${Math.min(5 - allArticles.length, 5)} more today`,
    `Quality score target: >= 7 (current: ${qualityScore})`,
    `Cover gaps in: ${weakPillars.length ? weakPillars.join(", ") : "none — all pillars represented"}`,
    `SEO score per article: >= 7/10`,
  ];
  if (competitorNote) goals.push(competitorNote);
  if (gaps.length > 0) goals.push(`Rebalance: reduce ${gaps.join(", ")} articles`);

  const goalContent = [
    `# Marketing Goals — ${today}`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Total articles:** ${totalArticles}`,
    `**Quality score:** ${qualityScore}/10`,
    "",
    "## Daily Goals",
    ...goals.map((g) => `- [ ] ${g}`),
    "",
    "## Pillar Distribution",
    ...Object.entries(pillarCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([p, c]) => `- ${p}: ${c} (${(c / totalArticles * 100).toFixed(0)}%)`),
    "",
    "## Weak Pillars (need content)",
    weakPillars.length ? weakPillars.map((p) => `- ${p} (0 articles)`).join("\n") : "None — all pillars have content",
    "",
    "## Competitor Intelligence",
    competitorNote || "Unable to fetch competitor data",
    "",
    "---",
    "*Auto-generated by Marketing Agent*",
  ].join("\n");

  writeGoal(today, goalContent);

  // Weekly goal
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStr = weekStart.toISOString().split("T")[0];
  const weeklyContent = [
    `# Weekly Goals — Week of ${weekStr}`,
    `**Generated:** ${new Date().toISOString()}`,
    "",
    "## 3-Day Targets",
    `- Publish 5 articles`,
    `- Achieve average quality score >= 7`,
    `- Cover any pillar with 0 articles`,
    "- Ensure every article passes SEO spec (score >= 7)",
    "",
    "## 7-Day Targets",
    "- Publish 15 articles total",
    "- Distribute across 5+ pillars",
    "- Establish publishing cadence",
    "",
    "*Auto-generated by Marketing Agent*",
  ].join("\n");
  writeWeeklyGoal(weekStr, weeklyContent);

  // ─── System Health ─────────────────────────────────────────────────────
  const sysHealth = await runSystemHealth();

  log(`[Marketing Agent] Goals written for ${today}`);
  log(`  Quality score: ${qualityScore}/10, Gaps: ${weakPillars.join(", ") || "none"}`);
  log(`  System health: ${sysHealth.allOk ? "ALL OK" : "issues found"}`);

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
