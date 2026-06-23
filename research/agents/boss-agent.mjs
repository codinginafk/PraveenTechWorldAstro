import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log, callLLM, ensureDir } from "./lib/shared.mjs";
import { buildReport, writeReport, getReportPath } from "./lib/report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESEARCH_DIR = path.resolve(__dirname, "../research");
const ARTICLES_DIR = path.resolve(__dirname, "../../src/content/articles");
const VALID_PILLARS = ["website-setup", "windows-fixes", "hosting-infra", "ai-websites", "ai-automation", "it-operations", "build-in-public"];

const SCORING = {
  IMPRESSIONS_WEIGHT: 0.30,
  SUPPORTS_CLUSTER_WEIGHT: 0.20,
  LOW_COMPETITION_WEIGHT: 0.15,
  EVERGREEN_WEIGHT: 0.10,
  CTR_PERFORMANCE_WEIGHT: 0.15,
  FRAMEWORK_ALIGNMENT_WEIGHT: 0.10,
};

function countPillarDistribution() {
  const counts = { "website-setup": 0, "windows-fixes": 0, "hosting-infra": 0, "ai-websites": 0, "ai-automation": 0, "it-operations": 0, "build-in-public": 0 };
  if (!fs.existsSync(ARTICLES_DIR)) return counts;
  for (const f of fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"))) {
    try {
      const content = fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8");
      const pillarMatch = content.match(/pillarId:\s*(\S+)/);
      const catMatch = content.match(/category:\s*(\S+)/);
      const id = pillarMatch?.[1] || catMatch?.[1] || "";
      if (counts[id] !== undefined) counts[id]++;
    } catch {}
  }
  return counts;
}

function checkHubPages() {
  const hubDir = path.resolve(__dirname, "../../src/content/hubs");
  if (!fs.existsSync(hubDir)) return {};
  return Object.fromEntries(fs.readdirSync(hubDir).filter(f => f.endsWith(".mdx")).map(f => [f.replace(/\.mdx$/, ""), true]));
}

// Load analytics data for per-article performance
function loadAnalytics() {
  try {
    const f = path.join(__dirname, "analytics-data.json");
    return JSON.parse(fs.readFileSync(f, "utf-8"));
  } catch { return null; }
}

// Compute cluster-level CTR and average position
function computeClusterPerformance(analytics) {
  const perf = { "website-setup": { clicks: 0, impressions: 0, articles: 0, positions: [] },
    "windows-fixes": { clicks: 0, impressions: 0, articles: 0, positions: [] },
    "hosting-infra": { clicks: 0, impressions: 0, articles: 0, positions: [] },
    "ai-websites": { clicks: 0, impressions: 0, articles: 0, positions: [] } };
  if (!analytics?.gscData) return perf;
  const clusterMap = [
    { keywords: ["search console", "google analytics", "analytics", "sitemap", "indexing", "verification", "ga4", "seo", "webmaster"], cluster: "website-setup" },
    { keywords: ["windows", "error", "fix", "reinstall", "reset", "recovery", "boot", "driver", "crash", "bsod", "update"], cluster: "windows-fixes" },
    { keywords: ["hosting", "domain", "dns", "ssl", "cloudflare", "server"], cluster: "hosting-infra" },
    { keywords: ["ai", "chatgpt", "claude", "gemini", "copilot", "llm"], cluster: "ai-websites" },
  ];
  for (const row of analytics.gscData) {
    const url = row.keys?.[0] || "";
    const lower = url.toLowerCase();
    for (const { keywords, cluster } of clusterMap) {
      if (keywords.some(k => lower.includes(k))) {
        perf[cluster].clicks += row.clicks || 0;
        perf[cluster].impressions += row.impressions || 0;
        perf[cluster].articles++;
        perf[cluster].positions.push(row.position || 0);
        break;
      }
    }
  }
  return perf;
}

function applyFourQuestionFilter(title, snippet, clusterId, pillarId) {
  const lower = ((title || "") + " " + (snippet || "")).toLowerCase();
  let detectedCluster = null;
  for (const p of VALID_PILLARS) {
    if (lower.includes(p.replace(/-/g, " ")) || lower.includes(p)) {
      detectedCluster = p;
      break;
    }
  }
  if (/search console|analytics|sitemap|indexing|verification|tracking/i.test(lower)) detectedCluster = "website-setup";
  else if (/windows|error|fix|reinstall|reset|recovery|boot|driver|crash|bsod/i.test(lower)) detectedCluster = "windows-fixes";
  else if (/hosting|domain|dns|ssl|cloudflare|github pages/i.test(lower)) detectedCluster = "hosting-infra";
  else if (/ai.*blog|ai.*seo|ai.*content|ai.*keyword/i.test(lower)) detectedCluster = "ai-websites";
  if (!detectedCluster) {
    if (pillarId && VALID_PILLARS.includes(pillarId)) detectedCluster = pillarId;
  }
  if (!detectedCluster) {
    return { pass: false, reason: "Q1: No valid cluster. REJECT." };
  }
  if (clusterId && detectedCluster !== clusterId) {
    // Allow if the topic framework aligns — token burn, chatbox, 14kb could fit website-setup or hosting-infra
    const frameworkTerms = ["token burn", "api cost", "ai agent", "sandbox", "local llm", "14kb", "web bloat", "payload size", "chatbox", "sqlite", "lm studio"];
    if (!frameworkTerms.some(t => lower.includes(t))) {
      return { pass: false, reason: `Q1: Topic belongs to "${detectedCluster}" not current sprint cluster "${clusterId}". REJECT.` };
    }
  }
  const trendyPatterns = [/2024|2025/, /news$/, /announced/, /released/, /launch/, /vs\s+\w+\s+\d/];
  const isTrendy = trendyPatterns.some(p => p.test(lower));
  if (isTrendy && /2024|2025/.test(lower)) {
    return { pass: false, reason: "Q4: Year-specific (2024/2025). REJECT." };
  }
  const offStrategy = ["android phone", "iphone", "resume", "fashion", "health", "crypto", "nft", "playstation", "linux"];
  if (offStrategy.some(t => lower.includes(t))) {
    return { pass: false, reason: "Off-strategy topic. REJECT." };
  }
  return { pass: true, cluster: detectedCluster };
}

function scoreTopic(title, snippet, clusterId, context) {
  const lower = ((title || "") + " " + (snippet || "")).toLowerCase();

  // Factor 1: GSC Impressions (30%)
  let impressionsScore = 0;
  if (context.gscMomentum && context.gscMomentum[clusterId]) {
    const momentum = context.gscMomentum[clusterId];
    if (momentum.totalImpressions > 100) impressionsScore = 10;
    else if (momentum.totalImpressions > 50) impressionsScore = 8;
    else if (momentum.totalImpressions > 10) impressionsScore = 6;
    else if (momentum.totalImpressions > 0) impressionsScore = 4;
  }
  if (context.gscQueries) {
    const queryMatch = context.gscQueries.some(q => lower.includes(q.toLowerCase()));
    if (queryMatch) impressionsScore = Math.max(impressionsScore, 9);
  }

  // Factor 2: Supports Existing Cluster (20%)
  const clusterCount = context.pillarDistribution?.[clusterId] || 0;
  let supportScore = 0;
  if (clusterCount > 20) supportScore = 10;
  else if (clusterCount > 10) supportScore = 8;
  else if (clusterCount > 5) supportScore = 6;
  else if (clusterCount > 0) supportScore = 4;
  else supportScore = 2;

  // Factor 3: Low Competition (15%)
  const isProblemTitle = /fix|error|not working|won.t|can.t|doesn.t|failed|stuck|how to/i.test(lower);
  const isListicle = /best|top|vs|review|comparison|alternative/i.test(lower);
  let competitionScore = 0;
  if (isProblemTitle) competitionScore = 9;
  else if (!isListicle) competitionScore = 6;
  else competitionScore = 2;

  // Factor 4: Evergreen (10%)
  const isYearSped = /2026|2027/.test(title);
  const isEvergreen = !/2024|2025/.test(title) && !lower.includes("news") && !lower.includes("announced");
  let evergreenScore = isEvergreen ? (isYearSped ? 8 : 10) : 2;

  // Factor 5: CTR Performance (15%) — NEW
  let ctrScore = 5; // default mid
  if (context.clusterPerformance) {
    const cp = context.clusterPerformance[clusterId];
    if (cp) {
      const avgPosition = cp.positions.length > 0 ? cp.positions.reduce((a, b) => a + b, 0) / cp.positions.length : 0;
      const ctr = cp.impressions > 0 ? cp.clicks / cp.impressions : 0;
      if (ctr > 0.05) ctrScore = 10;     // >5% CTR — strong
      else if (ctr > 0.02) ctrScore = 8;  // 2-5% — decent
      else if (ctr > 0) ctrScore = 6;     // >0% — some traction
      else if (avgPosition > 0 && avgPosition < 30) ctrScore = 7; // ranking but no clicks — need better descriptions
      else ctrScore = 3; // no traction
      // Bonus for position < 20
      if (avgPosition > 0 && avgPosition < 20) ctrScore = Math.min(ctrScore + 2, 10);
    }
  }

  // Factor 6: Framework Alignment (10%) — NEW
  const frameworkTerms = ["token burn", "api cost tracking", "ai agent", "sandbox", "local llm", "lm studio",
    "14kb", "web bloat", "vanilla js", "payload", "chatbox", "sqlite", "openrouter", "boundary prompt",
    "autonomous", "agent sandbox", "edge computing", "serverless"];
  const matchesFramework = frameworkTerms.filter(t => lower.includes(t)).length;
  let frameworkScore = 0;
  if (matchesFramework >= 3) frameworkScore = 10;
  else if (matchesFramework >= 2) frameworkScore = 8;
  else if (matchesFramework >= 1) frameworkScore = 6;
  else frameworkScore = 3;

  const total = (
    impressionsScore * SCORING.IMPRESSIONS_WEIGHT +
    supportScore * SCORING.SUPPORTS_CLUSTER_WEIGHT +
    competitionScore * SCORING.LOW_COMPETITION_WEIGHT +
    evergreenScore * SCORING.EVERGREEN_WEIGHT +
    ctrScore * SCORING.CTR_PERFORMANCE_WEIGHT +
    frameworkScore * SCORING.FRAMEWORK_ALIGNMENT_WEIGHT
  );

  return {
    total: Math.round(total * 10) / 10,
    breakdown: {
      impressions: impressionsScore,
      supportsCluster: supportScore,
      lowCompetition: competitionScore,
      evergreen: evergreenScore,
      ctrPerformance: ctrScore,
      frameworkAlignment: frameworkScore,
    },
  };
}

export async function runBoss(candidates, context) {
  log("[Boss Agent] Scoring and filtering candidates...");
  const pillarDist = countPillarDistribution();
  const hubs = checkHubPages();
  const currentCluster = context.currentCluster || "website-setup";

  // Load analytics for per-article performance
  const analytics = loadAnalytics();
  const clusterPerformance = computeClusterPerformance(analytics);

  const gscQueries = [];
  if (context.gscMomentum) {
    for (const [cluster, data] of Object.entries(context.gscMomentum)) {
      if (data.topQuery) gscQueries.push(data.topQuery.query);
    }
  }

  const approved = [];
  const rejected = [];

  for (const c of candidates) {
    const title = c.seoTitle || c.topic?.title || "";
    const snippet = c.topic?.snippet || "";
    const topicCluster = c.pillarId || currentCluster;
    const pillarId = c.pillarId || c.pillarFit || null;
    const filterResult = applyFourQuestionFilter(title, snippet, topicCluster, pillarId);
    if (!filterResult.pass) {
      rejected.push({ title, reason: filterResult.reason });
      continue;
    }

    const detectedCluster = filterResult.cluster || topicCluster;

    const score = scoreTopic(title, snippet, detectedCluster, {
      ...context,
      pillarDistribution: pillarDist,
      gscQueries,
      clusterPerformance,
    });

    if (score.total < 5) {
      rejected.push({ title, reason: `Score ${score.total}/10 — too low. Breakdown: ${JSON.stringify(score.breakdown)}` });
      continue;
    }

    approved.push({
      ...c,
      bossScore: score.total,
      scoreBreakdown: score.breakdown,
      pillarId: detectedCluster,
      hubSlug: hubs[detectedCluster.replace(/-/g, "")] ? detectedCluster.replace(/-/g, "") : null,
    });

    log(`  APPROVED (${score.total}/10): ${title.slice(0, 60)}`);
  }

  for (const r of rejected) {
    log(`  REJECTED: ${r.title.slice(0, 50)} — ${r.reason.slice(0, 80)}`);
  }

  approved.sort((a, b) => b.bossScore - a.bossScore);
  log(`[Boss Agent] Approved ${approved.length}/${candidates.length} candidates`);
  return approved;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const topicsFile = process.argv[2];
  if (topicsFile) {
    const data = JSON.parse(fs.readFileSync(topicsFile, "utf-8"));
    runBoss(data.topics || [], {}).catch(console.error);
  } else {
    console.log("Usage: node boss-agent.mjs <topics-file.json>");
  }
}
