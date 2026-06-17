import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log, callLLM, ensureDir } from "./lib/shared.mjs";
import { buildReport, writeReport, getReportPath } from "./lib/report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESEARCH_DIR = path.resolve(__dirname, "../research");
const ARTICLES_DIR = path.resolve(__dirname, "../../src/content/articles");
const VALID_PILLARS = ["website-setup", "windows-fixes", "hosting-infra", "ai-websites"];

// Scoring weights (out of 10)
const SCORING = {
  IMPRESSIONS_WEIGHT: 0.40,  // Already getting GSC impressions → 40%
  SUPPORTS_CLUSTER_WEIGHT: 0.30, // Strengthens existing cluster → 30%
  LOW_COMPETITION_WEIGHT: 0.20,  // Low competition → 20%
  EVERGREEN_WEIGHT: 0.10,       // Will be searched next year → 10%
};

function countPillarDistribution() {
  const counts = { "website-setup": 0, "windows-fixes": 0, "hosting-infra": 0, "ai-websites": 0 };
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

// FOUR QUESTION FILTER
function applyFourQuestionFilter(title, snippet, clusterId, pillarId) {
  const lower = ((title || "") + " " + (snippet || "")).toLowerCase();

  // Q1: Which cluster does this belong to?
  let detectedCluster = null;
  for (const p of VALID_PILLARS) {
    if (lower.includes(p.replace(/-/g, " ")) || lower.includes(p)) {
      detectedCluster = p;
      break;
    }
  }
  // Heuristic cluster detection
  if (/search console|analytics|sitemap|indexing|verification|tracking/i.test(lower)) detectedCluster = "website-setup";
  else if (/windows|error|fix|reinstall|reset|recovery|boot|driver|crash|bsod/i.test(lower)) detectedCluster = "windows-fixes";
  else if (/hosting|domain|dns|ssl|cloudflare|github pages/i.test(lower)) detectedCluster = "hosting-infra";
  else if (/ai.*blog|ai.*seo|ai.*content|ai.*keyword/i.test(lower)) detectedCluster = "ai-websites";

  // If heuristic failed, trust explicit pillarId or pillarFit from LLM scoring
  if (!detectedCluster) {
    if (pillarId && VALID_PILLARS.includes(pillarId)) detectedCluster = pillarId;
  }

  if (!detectedCluster) {
    return { pass: false, reason: "Q1: No valid cluster. REJECT." };
  }

  if (clusterId && detectedCluster !== clusterId) {
    return { pass: false, reason: `Q1: Topic belongs to "${detectedCluster}" not current sprint cluster "${clusterId}". REJECT.` };
  }

  // Q2: Does it strengthen an existing cluster?
  // (Checked by checking if we already have articles in this cluster)
  const existingCount = countPillarDistribution()[detectedCluster] || 0;
  if (existingCount === 0 && detectedCluster !== clusterId) {
    // Don't start a new cluster mid-sprint unless it's the sprint's secondary
  }

  // Q3: Can it link to at least 3 existing articles?
  // (Deferred to generation time — checked when generating internal links)

  // Q4: Will people search this next year?
  const trendyPatterns = [/2024|2025/, /news$/, /announced/, /released/, /launch/, /vs\s+\w+\s+\d/];
  const isTrendy = trendyPatterns.some(p => p.test(lower));
  if (isTrendy && /2024|2025/.test(lower)) {
    return { pass: false, reason: "Q4: Year-specific (2024/2025) — unlikely to be searched next year. REJECT." };
  }

  // Check for off-strategy topics
  const offStrategy = ["android phone", "iphone", "resume", "fashion", "health", "crypto", "nft", "playstation", "linux"];
  if (offStrategy.some(t => lower.includes(t))) {
    return { pass: false, reason: "Off-strategy topic. REJECT." };
  }

  return { pass: true, cluster: detectedCluster };
}

// SCORING FRAMEWORK — 40/30/20/10
function scoreTopic(title, snippet, clusterId, context) {
  const lower = ((title || "") + " " + (snippet || "")).toLowerCase();

  // Factor 1: Already Getting Impressions (40%)
  let impressionsScore = 0;
  if (context.gscMomentum && context.gscMomentum[clusterId]) {
    const momentum = context.gscMomentum[clusterId];
    if (momentum.totalImpressions > 100) impressionsScore = 10;
    else if (momentum.totalImpressions > 50) impressionsScore = 8;
    else if (momentum.totalImpressions > 10) impressionsScore = 6;
    else if (momentum.totalImpressions > 0) impressionsScore = 4;
  }
  // If GSC shows this specific query getting impressions, bonus
  if (context.gscQueries) {
    const queryMatch = context.gscQueries.some(q => lower.includes(q.toLowerCase()));
    if (queryMatch) impressionsScore = Math.max(impressionsScore, 9);
  }

  // Factor 2: Can Support Existing Articles (30%)
  const clusterCount = context.pillarDistribution?.[clusterId] || 0;
  let supportScore = 0;
  if (clusterCount > 20) supportScore = 10; // Large cluster — every new article adds depth
  else if (clusterCount > 10) supportScore = 8;
  else if (clusterCount > 5) supportScore = 6;
  else if (clusterCount > 0) supportScore = 4;
  else supportScore = 2; // First article in cluster

  // Factor 3: Low Competition (20%)
  // Problem-based titles have lower competition
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

  // Compute weighted total
  const total = (
    impressionsScore * SCORING.IMPRESSIONS_WEIGHT +
    supportScore * SCORING.SUPPORTS_CLUSTER_WEIGHT +
    competitionScore * SCORING.LOW_COMPETITION_WEIGHT +
    evergreenScore * SCORING.EVERGREEN_WEIGHT
  );

  return {
    total: Math.round(total * 10) / 10,
    breakdown: {
      impressions: impressionsScore,
      supportsCluster: supportScore,
      lowCompetition: competitionScore,
      evergreen: evergreenScore,
    },
  };
}

export async function runBoss(candidates, context) {
  log("[Boss Agent] Scoring and filtering candidates...");
  const pillarDist = countPillarDistribution();
  const hubs = checkHubPages();
  const currentCluster = context.currentCluster || "website-setup";

  // Build GSC query list if available
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

    // Q1-Q4 Filter (pass pillarId/pillarFit from LLM scoring as fallback for heuristic)
    const pillarId = c.pillarId || c.pillarFit || null;
    const filterResult = applyFourQuestionFilter(title, snippet, topicCluster, pillarId);
    if (!filterResult.pass) {
      rejected.push({ title, reason: filterResult.reason });
      continue;
    }

    const detectedCluster = filterResult.cluster || topicCluster;

    // Score using 40/30/20/10 framework
    const score = scoreTopic(title, snippet, detectedCluster, {
      ...context,
      pillarDistribution: pillarDist,
      gscQueries,
    });

    // Reject if score < 5
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
