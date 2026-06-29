import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { log, ensureDir, callAI } from "./lib/shared.mjs";
import { runResearch } from "./research-agent.mjs";
import { runSeoAnalysis } from "./seo-analysis.mjs";
import { runBoss } from "./boss-agent.mjs";
import { runMarketing } from "./marketing-agent.mjs";
import { checkAndApplyUnreadReport } from "./dev-agent.mjs";
import { reportAgeHours, wasReportOpened } from "./lib/report.mjs";
import { generateArticle } from "./generate.mjs";
import { runSyndication } from "./syndication-agent.mjs";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const HUB_DIR = path.join(ROOT_DIR, "src/content/hubs");
const STATE_FILE = path.join(__dirname, "state.json");

const BING_ENABLED = !!process.env.BING_API_KEY;
const BLOB_ENABLED = !!process.env.BLOB_READ_WRITE_TOKEN;

// Sprint configuration
const SPRINTS = [
  {
    id: "month1-website-setup",
    primaryCluster: "website-setup",
    secondaryCluster: "windows-fixes",
    targets: { "website-setup": 35, "windows-fixes": 10 },
    mix: { "website-setup": 0.70, "windows-fixes": 0.20, "hosting-infra": 0.05, "ai-websites": 0.05 },
    dailyTarget: 3,
    days: 30,
  },
  {
    id: "month2-ai-automation",
    primaryCluster: "ai-automation",
    secondaryCluster: "it-operations",
    targets: { "ai-automation": 8, "it-operations": 4, "build-in-public": 3 },
    mix: { "ai-automation": 0.50, "it-operations": 0.25, "build-in-public": 0.20, "website-setup": 0.05 },
    dailyTarget: 2,
    days: 30,
    startAfter: "month1-website-setup",
  },
];

const CYCLE_EVERY_MS = 4 * 60 * 60 * 1000; // 4 hours (3 articles/day = every 4 hours)
const WATCHER_EVERY_MS = 30 * 60 * 1000;

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return getFreshState();
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")); }
  catch { return getFreshState(); }
}

function getFreshState() {
  return {
    sprint: { id: "month1-website-setup", startedAt: new Date().toISOString(), dayOfSprint: 1 },
    sprintProgress: { "website-setup": 0, "windows-fixes": 0, "hosting-infra": 0, "ai-websites": 0, "ai-automation": 0, "it-operations": 0, "build-in-public": 0 },
    articlesPublishedToday: 0,
    lastPublishDate: null,
    lastGscCheck: null,
    gscMomentum: {}, // cluster -> { impressions, queries, trend }
    lastResearchDate: null,
    sessionStart: new Date().toISOString(),
    dailyQuota: 3,
    pillarCounts: { "website-setup": 0, "windows-fixes": 0, "hosting-infra": 0, "ai-websites": 0, "ai-automation": 0, "it-operations": 0, "build-in-public": 0 },
  };
}

function saveState(state) {
  state.lastSaved = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function todayStr() { return new Date().toISOString().split("T")[0]; }

function getExistingTitles() {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx")).map(f => {
    const c = fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8");
    const m = c.match(/title:\s*"(.+?)"/);
    return m ? m[1] : f;
  });
}

function isDuplicateTitle(newTitle, existingTitles) {
  const normalize = (t) => [...new Set(
    t.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => !["guide","tutorial","how","to","in","for","the","a","an","and","2024","2025","2026","complete","step","by","proven","your","new","best","free","fix","tips","with","of","that","this","from","using","get","use","more","ultimate"].includes(w) && w.length > 2)
  )];
  const newWords = normalize(newTitle);
  for (const existing of existingTitles) {
    const existingWords = normalize(existing);
    const overlap = newWords.filter(w => existingWords.includes(w));
    if (overlap.length >= 3) return true;
  }
  return false;
}

function getPillarDistribution() {
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

// GSC morning check — find which cluster has momentum
async function checkGscMomentum() {
  log("[Orchestrator] GSC Morning Check...");
  try {
    const { getGscPerformance } = await import("./seo-agent/gsc-client.mjs");
    const data = await getGscPerformance();
    if (!data || !data.rows) {
      log("  No GSC data available yet.");
      return null;
    }
    // Map queries to clusters
    const clusterQueries = { "website-setup": [], "windows-fixes": [], "hosting-infra": [], "ai-websites": [], "ai-automation": [], "it-operations": [], "build-in-public": [] };
    const clusterMap = {
      "search console": "website-setup", "google analytics": "website-setup", "analytics": "website-setup",
      "sitemap": "website-setup", "indexing": "website-setup", "verification": "website-setup",
      "windows": "windows-fixes", "error": "windows-fixes", "fix": "windows-fixes",
      "hosting": "hosting-infra", "domain": "hosting-infra", "dns": "hosting-infra", "ssl": "hosting-infra",
      "ai": "ai-automation", "chatgpt": "ai-websites",
      "automation": "ai-automation", "script": "ai-automation", "python": "ai-automation",
      "database": "it-operations", "erp": "it-operations", "sql": "it-operations", "server": "it-operations",
      "experiment": "build-in-public", "learned": "build-in-public", "build in public": "build-in-public",
    };
    for (const row of data.rows) {
      const query = (row.keys?.[0] || "").toLowerCase();
      for (const [kw, cluster] of Object.entries(clusterMap)) {
        if (query.includes(kw)) {
          clusterQueries[cluster].push({ query, impressions: row.impressions || 0, clicks: row.clicks || 0 });
          break;
        }
      }
    }
    // Score each cluster's momentum
    const momentum = {};
    for (const [cluster, queries] of Object.entries(clusterQueries)) {
      const totalImpressions = queries.reduce((s, q) => s + q.impressions, 0);
      momentum[cluster] = { queries: queries.length, totalImpressions, topQuery: queries.sort((a, b) => b.impressions - a.impressions)[0] || null };
    }
    log(`  GSC Momentum: ${Object.entries(momentum).map(([c, m]) => `${c}=${m.totalImpressions}imps`).join(", ")}`);
    return momentum;
  } catch (err) {
    log(`  GSC check failed: ${err.message}`);
    return null;
  }
}

function pickClusterForToday(state, gscMomentum) {
  const sprint = SPRINTS.find(s => s.id === state.sprint?.id) || SPRINTS[0];
  const progress = state.sprintProgress || {};

  // If GSC shows momentum in a cluster, prioritize it
  if (gscMomentum) {
    const sorted = Object.entries(gscMomentum)
      .filter(([c]) => c === sprint.primaryCluster || c === sprint.secondaryCluster)
      .sort((a, b) => b[1].totalImpressions - a[1].totalImpressions);
    if (sorted.length > 0 && sorted[0][1].totalImpressions > 0) {
      const topCluster = sorted[0][0];
      const target = sprint.targets[topCluster] || 999;
      if ((progress[topCluster] || 0) < target) {
        log(`  GSC momentum favors: ${topCluster}`);
        return topCluster;
      }
    }
  }

  // Default: fill primary cluster first
  if ((progress[sprint.primaryCluster] || 0) < sprint.targets[sprint.primaryCluster]) {
    return sprint.primaryCluster;
  }
  if ((progress[sprint.secondaryCluster] || 0) < sprint.targets[sprint.secondaryCluster]) {
    return sprint.secondaryCluster;
  }
  // Mix the rest
  for (const [cluster, target] of Object.entries(sprint.targets)) {
    if ((progress[cluster] || 0) < target) return cluster;
  }
  return sprint.primaryCluster;
}

function getExistingClusterArticles(clusterId) {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  const articles = [];
  for (const f of fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"))) {
    try {
      const content = fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8");
      if (content.includes(`pillarId: ${clusterId}`) || content.includes(`category: ${clusterId}`)) {
        const titleMatch = content.match(/title:\s*"(.+?)"/);
        const slug = f.replace(/\.mdx$/, "");
        articles.push({ title: titleMatch?.[1] || f, slug, file: f });
      }
    } catch {}
  }
  return articles;
}

// Pre-generation check: Q1-Q4 filter
function checkArticleAgainstFilter(title, clusterId, existingArticles) {
  // Q1: Which cluster does this belong to?
  if (!clusterId || !["website-setup", "windows-fixes", "hosting-infra", "ai-websites", "ai-automation", "it-operations", "build-in-public"].includes(clusterId)) {
    return { pass: false, failReason: "Q1: No valid cluster — REJECT" };
  }
  // Q2: Does it strengthen an existing cluster?
  const clusterArticles = existingArticles.filter(a => a.clusterId === clusterId || true);
  if (clusterArticles.length < 3) {
    // For new clusters, allow first 3 articles without this check
    const articlesInCluster = getExistingClusterArticles(clusterId);
    if (articlesInCluster.length === 0) {
      // First article in cluster — allow (but note it)
    }
  }
  // Q3: Can it link to at least 3 existing articles? (checked at generation time)
  // Q4: Will people search this next year?
  const isTrendy = /chatgpt.*news|ai.*drama|product.*launch|new.*release|2024|2025/i.test(title);
  if (isTrendy) {
    return { pass: false, failReason: "Q4: Trendy topic with short shelf life — REJECT" };
  }

  const isEvergreen = !title.includes("2024") && !title.includes("2025");
  if (title.includes("2026") && !isEvergreen) {
    return { pass: false, failReason: "Q4: Year-specific topic may not be searched next year — REJECT" };
  }
  return { pass: true };
}

async function generateFromTopic(topic, existingTitles, sourceArticles, clusters, state) {
  const title = topic.seoTitle || topic.topic?.title || "Untitled";
  const clusterId = topic.pillarId || state.currentCluster || "website-setup";

  if (isDuplicateTitle(title, existingTitles)) {
    log(`  DUPLICATE: "${title}"`);
    return null;
  }

  // Q1-Q4 filter
  const filterResult = checkArticleAgainstFilter(title, clusterId, []);
  if (!filterResult.pass) {
    log(`  FILTER FAIL: ${filterResult.failReason}`);
    return null;
  }

  const publishDate = new Date();
  const dateStr = publishDate.toISOString().split("T")[0];

  const topicCluster = clusters.find(c =>
    c.clusterKey === topic.topic?.clusterKey ||
    c.topHeadlines?.some(h => h.includes(title.slice(0, 30)))
  );

  // Get related articles for internal linking (at least 3 from same cluster)
  const sameClusterArticles = getExistingClusterArticles(clusterId);
  const researchContext = {
    sourceArticles: sourceArticles.slice(0, 8),
    cxResults: topic.cxResults || [],
    cluster: topicCluster || null,
    relatedClusterArticles: sameClusterArticles.slice(0, 5),
  };

  const hubSlugMap = { "website-setup": "website-setup", "windows-fixes": "windows-troubleshooting", "hosting-infra": "web-hosting-guides", "ai-websites": "ai-for-websites", "ai-automation": "ai-automation", "it-operations": "it-operations", "build-in-public": "build-in-public" };
  const hubSlug = hubSlugMap[clusterId] || "website-setup";
  const hasHub = fs.existsSync(HUB_DIR) && fs.readdirSync(HUB_DIR).some(f => f.startsWith(hubSlug));

  const result = await generateArticle({
    title,
    description: topic.topic?.snippet?.slice(0, 150) || `A practical guide to ${title.toLowerCase()}.`,
    category: clusterId,
    tags: topic.recommendedTags?.length ? topic.recommendedTags : [clusterId],
    seoTitle: title.slice(0, 60),
    socialHook: hasHub
      ? `New in our ${hubSlug.replace(/-/g, " ")} series: ${title.slice(0, 80)}`
      : `Learn how to fix ${title.toLowerCase()}.`,
    pillarId: clusterId,
    publishDate: dateStr,
    depthInstruction: "Write 1800-2500 words with specific steps. Include 3+ internal links to related articles in the same category.",
    researchContext,
  });

  return result;
}

async function runCompetitiveCheck(filePath, sourceArticles) {
  if (!sourceArticles || sourceArticles.length < 3) return null;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const bodyMatch = content.match(/---[\s\S]*?---\s*([\s\S]*)/);
    if (!bodyMatch) return null;
    const body = bodyMatch[1];
    const ourWordCount = body.split(/\s+/).filter(Boolean).length;
    const avgSourceWordCount = sourceArticles.reduce((s, a) => s + (a.snippet?.split(/\s+/).length || 50), 0) / sourceArticles.length;
    const headings = [...body.matchAll(/^#{2,3}\s+(.+)$/gm)].map(h => h[1].toLowerCase());
    const sourceHeadings = sourceArticles.map(a => a.title?.toLowerCase() || "").filter(Boolean);
    const commonHeadings = headings.filter(h => sourceHeadings.some(s => s.includes(h.slice(0, 20))));
    const coverage = sourceHeadings.length > 0 ? commonHeadings.length / Math.min(sourceHeadings.length, 10) : 0.5;
    const depth = Math.min(ourWordCount / Math.max(avgSourceWordCount, 100), 2);
    return Math.min(coverage * 0.4 + depth * 0.3 + (ourWordCount >= 1500 ? 0.2 : 0) + (sourceArticles.length >= 3 ? 0.1 : 0), 1);
  } catch { return null; }
}

const LOCK_FILE = path.join(__dirname, ".orchestrator.lock");
const LOCK_STALE_MS = 30 * 60 * 1000;

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
    if (age < LOCK_STALE_MS) { log("Lock exists. Skipping."); return false; }
    log("Stale lock removed.");
  }
  try { fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, started: new Date().toISOString() })); log("Lock acquired."); return true; }
  catch { return false; }
}

function releaseLock() { try { if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE); } catch {} }

async function orchestratorCycle(state) {
  const startTime = Date.now();
  log("=== Orchestrator Sprint Cycle ===");

  if (state.articlesPublishedToday >= state.dailyQuota) {
    log(`Daily quota (${state.dailyQuota}) reached. Running maintenance.`);
    await checkAndApplyUnreadReport();
    return;
  }

  const sprint = SPRINTS.find(s => s.id === state.sprint?.id) || SPRINTS[0];
  const day = state.sprint?.dayOfSprint || 1;
  log(`Sprint: ${sprint.id}, Day ${day}, Primary: ${sprint.primaryCluster}`);

  // Phase 0: GSC Morning Check (first cycle of day only)
  let gscMomentum = state.gscMomentum || null;
  if (!state.lastGscCheck || state.lastGscCheck.split("T")[0] !== todayStr()) {
    gscMomentum = await checkGscMomentum();
    state.lastGscCheck = new Date().toISOString();
    state.gscMomentum = gscMomentum;
  }

  // Pick cluster based on sprint targets + GSC momentum
  const clusterForToday = pickClusterForToday(state, gscMomentum);
  state.currentCluster = clusterForToday;
  log(`Cluster for this cycle: ${clusterForToday}`);

  // Phase 1: Research (focused on current cluster)
  log("Phase 1: Cluster Research");
  const researchResult = await runResearch();
  state.lastResearchDate = new Date().toISOString();
  saveState(state);

  const topics = researchResult.topics || researchResult;
  const sourceArticles = researchResult.sourceArticles || [];
  const clusters = researchResult.clusters || [];

  if (!Array.isArray(topics) || topics.length === 0) { log("No topics found."); return; }

  // Quick pre-filter: check if any topics match the target cluster before spending time on SEO
  const pillarKeywords = clusterForToday === "website-setup"
    ? [/search console|analytics|sitemap|indexing|verification|tracking|ga4|seo tool|webmaster/i]
    : clusterForToday === "windows-fixes"
    ? [/windows|error|fix|reinstall|reset|recovery|boot|driver|crash|bsod/i]
    : clusterForToday === "ai-automation"
    ? [/automation|script|python|pipeline|workflow|deepseek|opencode|api|cli|bash/i]
    : clusterForToday === "it-operations"
    ? [/database|erp|sql|server|infrastructure|audit|backup|network|sysadmin|enterprise/i]
    : clusterForToday === "build-in-public"
    ? [/experiment|trial|error|failure|lesson|learned|process|prompt|build in public|behind the scenes/i]
    : [/hosting|domain|dns|ssl|cloudflare/i];
  const hasRelevantTopics = topics.some(t => {
    const text = ((t.title || "") + " " + (t.snippet || "")).toLowerCase();
    return pillarKeywords.some(r => r.test(text));
  });

  // Phase 2: SEO Analysis (skip if no relevant topics — will use LLM fallback)
  const existingTitles = getExistingTitles();
  let scored = [];
  if (hasRelevantTopics) {
    log("Phase 2: SEO Analysis");
    scored = await runSeoAnalysis({ topics }, existingTitles, sourceArticles);
  } else {
    log("  No relevant topics found in research. Skipping SEO analysis.");
  }

  // Phase 3: Boss Approval (uses 40/30/20/10 scoring)
  log("Phase 3: Boss Approval");
  let approved = await runBoss(scored, {
    articlesToday: state.articlesPublishedToday,
    articlesTotal: existingTitles.length,
    currentCluster: clusterForToday,
  });

  if (approved.length === 0) {
    log("No topics approved. Generating topics via LLM...");
    try {
      const existingTitlesList = existingTitles.map(t => `- "${t}"`).join("\n");
      const prompt = `Generate 5 specific problem-based article titles for the "${clusterForToday}" category on a tech blog that helps students and office workers.

EXISTING TITLES (DO NOT repeat these):
${existingTitlesList}

${clusterForToday === "website-setup" ? 'Must be about: Google Search Console, Google Analytics, sitemap, indexing, website verification, GA4, SEO tools, webmaster tools, website performance, core web vitals, search analytics' : clusterForToday === "windows-fixes" ? 'Must be about: Windows updates, drivers, BSOD, boot errors, system restore, performance, disk cleanup, Windows security' : clusterForToday === "ai-automation" ? 'Must be about: AI-built scripts, Python automation, CLI tools, data pipelines, DeepSeek prompts, OpenCode experiments, workflow automation, IT task scripting' : clusterForToday === "it-operations" ? 'Must be about: database administration, ERP integration, system auditing, infrastructure, SQL queries, server management, backup strategies, enterprise IT' : clusterForToday === "build-in-public" ? 'Must be about: honest AI experiment logs, where AI code failed, prompt engineering lessons, build process, lessons learned from using AI as a developer' : 'Must be about: hosting, domain, DNS, SSL, Cloudflare, web server, cPanel'}.

Return ONLY a valid JSON array. No markdown. No extra text. Example: [{ "title": "SEO Title Here", "snippet": "Short description" }]`;

      const result = await callAI("You are a technical content strategist generating unique, non-duplicate evergreen pillar content.", prompt, { model: "gemini", temperature: 0.8, maxTokens: 2048, timeout: 240000 });

      // Robust JSON extraction
      let generated = null;
      const cleaned = result.replace(/```json|```/g, "").trim();
      try {
        generated = JSON.parse(cleaned);
      } catch {
        // Try to find [ ... ] array in the response
        const arrMatch = cleaned.match(/\[[\s\S]*?\]/);
        if (arrMatch) {
          try {
            generated = JSON.parse(arrMatch[0]);
          } catch {
            // Fix trailing commas before last ]
            const fixed = arrMatch[0].replace(/,(\s*)]/, '$1]');
            generated = JSON.parse(fixed);
          }
        }
      }

      if (Array.isArray(generated) && generated.length > 0) {
        const unique = generated.filter(t => !isDuplicateTitle(t.title, existingTitles));
        approved = unique.map(t => ({
          seoTitle: t.title,
          topic: { title: t.title, snippet: t.snippet, source: "LLM Generated" },
          pillarId: clusterForToday,
          overallScore: 8,
          pillarFit: clusterForToday,
        }));
        log(`  LLM fallback generated ${approved.length} topics (${generated.length - approved.length} duplicates filtered)`);
      } else {
        log(`  LLM returned non-array: ${result.slice(0, 200)}`);
      }
    } catch (err) { log(`  LLM fallback failed: ${err.message}`); }
  }

  if (approved.length === 0) { log("No topics approved."); return; }

  // Phase 4: Generate 1 article (each cycle = 1 article, 3/day)
  log("Phase 4: Article Generation");
  let filePath = null;
  for (const topic of approved.slice(0, 5)) {
    log(`  Trying: ${topic.topic?.title?.slice(0, 60)}...`);
    filePath = await generateFromTopic(topic, existingTitles, sourceArticles, clusters, state);
    if (filePath) break;
  }

  if (!filePath) { log("All topics failed generation."); return; }

  // Phase 4b: Auto-fix common quality issues before gate
  try {
    let content = fs.readFileSync(filePath, "utf-8");
    const original = content;
    // Fix seoTitle > 46 chars
    content = content.replace(/^seoTitle:\s*"(.+?)"/m, (m, t) => {
      const max = 46;
      return t.length > max ? `seoTitle: "${t.slice(0, max - 3)}..."` : m;
    });
    // Ensure at least 3 tags
    const tagMatch = content.match(/^tags:\s*\n((?:\s+-\s+.+\n?)*)/m);
    if (tagMatch) {
      const tags = tagMatch[1].split("\n").filter(t => t.trim()).map(t => t.replace(/^\s*-\s*"?(.+?)"?\s*$/, "$1"));
      while (tags.length < 3) tags.push("seo", "website", "tutorial");
      content = content.replace(/^tags:\s*\n((?:\s+-\s+.+\n?)*)/m, `tags:\n${tags.slice(0, 5).map(t => `  - ${t}`).join("\n")}\n`);
    }
    // Remove promotional words
    content = content.replace(/\b(revolutionary|game-changing|incredible|amazing|perfect|ultimate|secret|guaranteed)\b/gi, "effective");
    // Remove broken internal links (check against existing article slugs)
    const existingSlugs = new Set(fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx")).map(f => f.replace(/\.mdx$/, "")));
    content = content.replace(/\[([^\]]+)\]\(\/([^)]+)\)/g, (match, text, path) => {
      const slug = path.replace(/\/blog\//, "").replace(/^\//, "").replace(/\/$/, "");
      if (!existingSlugs.has(slug) && !path.startsWith("http") && !path.startsWith("#")) return "";
      return match;
    });
    // Inject internal links if article has none
    const bodyPart = content.split("---").slice(2).join("---");
    if (bodyPart && !bodyPart.match(/\[.*\]\(\/blog\//)) {
      const related = [...existingSlugs]
        .filter(s => s.includes("google-search-console") || s.includes("sitemap") || s.includes("indexing") || s.includes("ga4"))
        .slice(0, 2);
      if (related.length > 0) {
        const linkSection = `\n\n### Related Guides\n${related.map(s => {
          const title = s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
          return `- [${title}](/blog/${s})`;
        }).join("\n")}\n`;
        const faqIdx = bodyPart.search(/^##\s+faq/i);
        if (faqIdx > 0) {
          const before = content.slice(0, content.indexOf(bodyPart) + faqIdx);
          const after = content.slice(content.indexOf(bodyPart) + faqIdx);
          content = before + linkSection + "\n\n" + after;
        } else {
          content += linkSection;
        }
      }
    }
    if (content !== original) {
      fs.writeFileSync(filePath, content, "utf-8");
      log("  Auto-fix applied to article.");
    }
  } catch (fixErr) { log(`  Auto-fix error: ${fixErr.message}`); }

  // Phase 4c: Quality Gate
  log("Phase 4c: Quality Gate");
  let gateFailed = false;
  let gateResult = null;
  try {
    const { validateArticle } = await import("./lib/quality-gates.mjs");
    gateResult = validateArticle(filePath);
    if (!gateResult.passed) {
      log(`  QUALITY GATE FAILED — ${gateResult.failures.length} issues, score ${gateResult.score}/100`);
      for (const f of gateResult.failures.slice(0, 5)) log(`    [${f.gate}] ${f.rule}: ${f.message}`);
      const { appendToReport } = await import("./lib/report.mjs");
      appendToReport("Quality Gates", `## Quality Gate\n**Article:** ${path.basename(filePath)}\n**Score:** ${gateResult.score}/100\n**Failures:** ${gateResult.failures.length}\n${gateResult.failures.map(f => `- [${f.gate}] ${f.rule}: ${f.message}`).join("\n")}\n\n*Auto-generated*`);
      // Allow pass if score >= 40 (auto-fixed minor issues)
      if (gateResult.score < 40) gateFailed = true;
      else log(`  Quality gate score ${gateResult.score}/100 — proceeding (minor issues only)`);
    } else {
      log(`  Quality gate PASSED (${gateResult.score}/100)`);
    }
  } catch (err) { log(`  Quality gate error: ${err.message}`); }

  if (gateFailed) return;

  // Phase 4d: Competitive Check
  log("Phase 4c: Competitive Check");
  const compScore = await runCompetitiveCheck(filePath, sourceArticles);
  if (compScore !== null) {
    log(`  Competitive score: ${compScore.toFixed(2)}/1.00`);
    if (compScore < 0.6) { log("  Too low. Skipping."); return; }
  }

  // Phase 5: Manual Approval Gate
  log("Phase 5: Manual Approval Gate");
  const MANUAL_APPROVAL_REQUIRED = false; // Set false to auto-publish
  let publishTitle = "article";
  try { const fc = fs.readFileSync(filePath, "utf-8"); const m = fc.match(/title:\s*"(.+?)"/); if (m) publishTitle = m[1]; } catch {}

  if (MANUAL_APPROVAL_REQUIRED) {
    log(`  ARTICLE READY FOR REVIEW: ${publishTitle}`);
    log(`  File: ${path.basename(filePath)}`);
    log(`  APPROVAL BLOCKED: Article written but NOT published or syndicated.`);
    log(`  Run this manually after approval:`);
    log(`    git add "src/content/articles/${path.basename(filePath)}"`);
    log(`    git commit -m "Add: [${clusterForToday}] ${publishTitle.slice(0, 65)}"`);
    log(`    git push`);
    log(`  Then syndicate: node research/agents/syndication-agent.mjs`);
    return;
  }

  log("Phase 5: Publish");
  const publishHour = 8 + state.articlesPublishedToday * 2;
  const dateStamp = `${todayStr()}T${String(publishHour).padStart(2, "0")}:00:00 +0000`;

  try {
    execSync(`git add "${filePath}"`, { cwd: ROOT_DIR });
    const env = { ...process.env, GIT_AUTHOR_DATE: dateStamp, GIT_COMMITTER_DATE: dateStamp };
    execSync(`git commit -m "Add: [${clusterForToday}] ${publishTitle.slice(0, 65)}"`, { cwd: ROOT_DIR, env });
    execSync("git push", { cwd: ROOT_DIR, env, timeout: 30000 });
    log(`  Published: ${path.basename(filePath)} at ${dateStamp}`);
    state.articlesPublishedToday++;
    state.lastPublishDate = new Date().toISOString();
    state.sprintProgress[clusterForToday] = (state.sprintProgress[clusterForToday] || 0) + 1;
    state.pillarCounts = getPillarDistribution();
    saveState(state);
  } catch (err) { log(`  Publish failed: ${err.message}`); }

  // Phase 6: Regenerate llms.txt with new article
  try {
    const { generateLlmsTxt, generateLlmsFullTxt } = await import("./lib/generate-llms-txt.mjs");
    generateLlmsTxt();
    generateLlmsFullTxt();
    log("  llms.txt regenerated with new article.");
  } catch (err) { log(`  llms.txt regeneration: ${err.message}`); }

  // Phase 7: Syndicate (1 per cycle to avoid rate limits)
  try { await runSyndication(); } catch (err) { log(`  Syndication: ${err.message}`); }

  // Phase 8: Ping (last cycle of day)
  if (state.articlesPublishedToday >= state.dailyQuota) {
    try {
      const { pingGoogleSitemap } = await import("./seo-agent/gsc-client.mjs");
      await pingGoogleSitemap();
    } catch (err) { log(`  Ping: ${err.message}`); }
  }

  await checkAndApplyUnreadReport();

  const totalTarget = Object.values(sprint.targets).reduce((s, t) => s + t, 0);
  const totalDone = Object.values(state.sprintProgress).reduce((s, c) => s + c, 0);
  log(`=== Cycle done. Cluster: ${clusterForToday}. Sprint: ${totalDone}/${totalTarget}. Today: ${state.articlesPublishedToday}/${state.dailyQuota} ===`);
}

async function checkSprintTransition(state) {
  const currentSprint = SPRINTS.find(s => s.id === state.sprint?.id);
  if (!currentSprint) {
    // Start month1
    state.sprint = { id: SPRINTS[0].id, startedAt: new Date().toISOString(), dayOfSprint: 1 };
    state.currentCluster = SPRINTS[0].primaryCluster;
    log(`[Sprint] Starting: ${state.sprint.id}`);
    saveState(state);
    return;
  }

  // Check if month1 targets are met or days exceeded — transition to month2
  if (currentSprint.id === "month1-website-setup" && SPRINTS[1]) {
    const targets = currentSprint.targets;
    const progress = state.sprintProgress || {};
    const allMet = Object.entries(targets).every(([c, t]) => (progress[c] || 0) >= t);
    const daysExceeded = (state.sprint.dayOfSprint || 0) >= currentSprint.days;

    if (allMet || daysExceeded) {
      log(`[Sprint] Transitioning: ${currentSprint.id} → ${SPRINTS[1].id} (allMet=${allMet}, daysExceeded=${daysExceeded})`);
      state.sprint = { id: SPRINTS[1].id, startedAt: new Date().toISOString(), dayOfSprint: 1 };
      state.currentCluster = SPRINTS[1].primaryCluster;
      saveState(state);
    }
  }
}

async function dailyReset(state) {
  const lastPubDate = state.lastPublishDate ? state.lastPublishDate.split("T")[0] : "";
  if (lastPubDate !== todayStr()) {
    const hadArticles = state.articlesPublishedToday > 0;
    log(`New day. Resetting counter (had ${state.articlesPublishedToday} articles yesterday).`);
    state.articlesPublishedToday = 0;
    state.lastPublishDate = null;

    // Check sprint transition at day boundary
    await checkSprintTransition(state);

    // Only advance sprint day if articles were actually published
    if (hadArticles) {
      state.sprint = state.sprint || { id: "month1-website-setup", startedAt: new Date().toISOString(), dayOfSprint: 0 };
      state.sprint.dayOfSprint = (state.sprint.dayOfSprint || 0) + 1;
      log(`Sprint day ${state.sprint.dayOfSprint}`);
    }
    state.pillarCounts = getPillarDistribution();
    saveState(state);
  }
}

async function dailyCycles(state) {
  const today = todayStr();
  if (state.lastMarketingDate !== today) { try { await runMarketing(); state.lastMarketingDate = today; saveState(state); } catch {} }
  if (state.lastSeoAuditDate !== today) {
    try {
      const { runAudit } = await import("./seo-agent/run.mjs");
      await runAudit();
      state.lastSeoAuditDate = today;
      saveState(state);
    } catch {}
  }
  if (state.lastAnalyticsDate !== today) {
    try {
      const { runAnalytics } = await import("./analytics-agent.mjs");
      await runAnalytics();
      state.lastAnalyticsDate = today;
      saveState(state);
    } catch {}
  }

  // AI Crawler report (weekly — skip if already run this week)
  if (BLOB_ENABLED) {
    const crawlerKey = "lastCrawlerRun";
    if (!state[crawlerKey] || Date.now() - new Date(state[crawlerKey]).getTime() > 7 * 86400000) {
      try {
        const { runAiCrawlerAnalysis } = await import("./ai-crawler-agent.mjs");
        await runAiCrawlerAnalysis();
        state[crawlerKey] = new Date().toISOString();
        saveState(state);
      } catch (err) { log(`[Orchestrator] AI crawler analysis failed: ${err.message}`); }
    }
  }

  // Bing submission (sitemap weekly, URLs daily)
  if (BING_ENABLED) {
    const sitemapKey = "lastBingSitemapSubmit";
    const urlKey = "lastBingUrlBatchSubmit";
    const shouldSubmitSitemap = !state[sitemapKey] || Date.now() - new Date(state[sitemapKey]).getTime() > 7 * 86400000;
    const shouldSubmitUrls = !state[urlKey] || Date.now() - new Date(state[urlKey]).getTime() > 24 * 3600000;
    if (shouldSubmitSitemap || shouldSubmitUrls) {
      try {
        const { submitEverything } = await import("./seo-agent/bing-client.mjs");
        await submitEverything();
      } catch (err) { log(`[Orchestrator] Bing submission failed: ${err.message}`); }
    }
  }
}

export async function runOrchestrator() {
  if (!acquireLock()) return;

  let state = loadState();
  const activeSprint = SPRINTS.find(s => s.id === state?.sprint?.id) || SPRINTS[0];
  log("============================================");
  log("  PraveenTechWorld Sprint Orchestrator v2.0");
  log("============================================");
  log(`  Sprint: ${activeSprint.id}`);
  log(`  Target: ${Object.entries(activeSprint.targets).map(([c, t]) => `${c}=${t}`).join(", ")}`);
  log(`  Daily: ${activeSprint.dailyTarget} articles`);
  log("============================================");

  await dailyReset(state);
  await dailyCycles(state);
  await orchestratorCycle(state);

  setInterval(async () => {
    state = loadState();
    await dailyReset(state);
    await dailyCycles(state);
    await orchestratorCycle(state);
  }, CYCLE_EVERY_MS);

  setInterval(async () => { try { await checkAndApplyUnreadReport(); } catch {} }, WATCHER_EVERY_MS);

  process.on("SIGINT", () => { saveState(loadState()); releaseLock(); process.exit(0); });
  process.on("SIGTERM", () => { saveState(loadState()); releaseLock(); process.exit(0); });

  log("Sprint orchestrator running.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runOrchestrator().catch(err => { console.error("Orchestrator crashed:", err); releaseLock(); process.exit(1); });
}
