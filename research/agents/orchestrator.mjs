import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { log, ensureDir } from "./lib/shared.mjs";
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
const RESEARCH_DIR = path.resolve(__dirname, "../research");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const STATE_FILE = path.join(__dirname, "state.json");
const RESEARCH_KEYWORDS = "Windows,troubleshooting,reinstall,reset,blue screen,driver,virus,slow performance,gaming FPS,clean install,system repair,PC diagnostics,error fix,crash,freeze,boot";

const DAILY_QUOTA = 5;
const RUN_EVERY_MS = 2 * 60 * 60 * 1000; // 2 hours
const WATCHER_EVERY_MS = 30 * 60 * 1000; // 30 min

// State management
function loadState() {
  if (!fs.existsSync(STATE_FILE)) return getFreshState();
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return getFreshState();
  }
}

function getFreshState() {
  return {
    articlesPublishedToday: 0,
    lastPublishDate: null,
    lastResearchDate: null,
    sessionStart: new Date().toISOString(),
    dailyQuota: DAILY_QUOTA,
  };
}

function saveState(state) {
  state.lastSaved = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function getExistingTitles() {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx"));
  return files.map((f) => {
    const c = fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8");
    const m = c.match(/title:\s*"(.+?)"/);
    return m ? m[1] : f;
  });
}

function isDuplicateTitle(newTitle, existingTitles) {
  const normalize = (t) => [...new Set(
    t.toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(w => !["guide","tutorial","how","to","in","for","the","a","an","and","2024","2025","2026","complete","step","by","proven","your","new","best","free","fix","tips","with","of","that","this","from","using","get","use","more","ultimate"].includes(w) && w.length > 2)
  )];
  const newWords = normalize(newTitle);
  for (const existing of existingTitles) {
    const existingWords = normalize(existing);
    const overlap = newWords.filter(w => existingWords.includes(w));
    if (overlap.length >= 3) return true;
  }
  return false;
}

// Article generation from approved topic
async function generateFromTopic(topic, existingTitles, sourceArticles = [], clusters = []) {
  log(`  Generating article: ${topic.topic?.title?.slice(0, 60)}...`);

  const title = topic.seoTitle || topic.topic?.title || "Untitled";
  const existing = existingTitles?.length || 0;

  if (isDuplicateTitle(title, existingTitles)) {
    log(`  SKIPPED — "${title}" is a semantic duplicate of an existing article`);
    return null;
  }
  const publishDate = new Date();
  const dateStr = publishDate.toISOString().split("T")[0];

  // Find matching cluster for research context
  const topicCluster = clusters.find((c) =>
    c.clusterKey === topic.topic?.clusterKey ||
    c.topHeadlines?.some((h) => h.includes(title.slice(0, 30)))
  );

  // Build research context from topic's cxResults and source articles
  const researchContext = {
    sourceArticles: sourceArticles.slice(0, 8),
    cxResults: topic.cxResults || [],
    cluster: topicCluster || null,
  };

  const result = await generateArticle({
    title: title,
    description: topic.topic?.snippet?.slice(0, 150) || `A practical guide to ${title.toLowerCase()}.`,
    category: topic.pillarFit || "ai-tools",
    tags: topic.recommendedTags?.length ? topic.recommendedTags : [topic.pillarFit || "ai-tools"],
    seoTitle: title.slice(0, 60),
    socialHook: topic.topic?.title?.slice(0, 120) || `Learn how to ${title.toLowerCase()}.`,
    publishDate: dateStr,
    depthInstruction: "Write 1800-2500 words with specific steps, examples, and actionable advice. Include a FAQ section at the end. Complex topics can go up to 3000 words.",
    researchContext,
  });

  return result;
}

// Competitive check: scores our article against source articles for depth/coverage
async function runCompetitiveCheck(filePath, sourceArticles = []) {
  if (!sourceArticles || sourceArticles.length < 3) return null;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const bodyMatch = content.match(/---[\s\S]*?---\s*([\s\S]*)/);
    if (!bodyMatch) return null;
    const body = bodyMatch[1];
    const ourWordCount = body.split(/\s+/).filter(Boolean).length;
    const avgSourceWordCount = sourceArticles.reduce((s, a) => s + (a.snippet?.split(/\s+/).length || 50), 0) / sourceArticles.length;

    const headingMatch = [...body.matchAll(/^#{2,3}\s+(.+)$/gm)];
    const ourHeadings = headingMatch.map((h) => h[1].toLowerCase());
    const sourceHeadings = sourceArticles.map((a) => a.title?.toLowerCase() || "").filter(Boolean);

    const commonHeadings = ourHeadings.filter((h) => sourceHeadings.some((s) => s.includes(h.slice(0, 20))));
    const coverageScore = sourceHeadings.length > 0 ? commonHeadings.length / Math.min(sourceHeadings.length, 10) : 0.5;
    const depthScore = Math.min(ourWordCount / Math.max(avgSourceWordCount, 100), 2);

    const coverageWeighted = coverageScore * 0.4;
    const depthWeighted = depthScore * 0.3;
    const lengthBonus = ourWordCount >= 1500 ? 0.2 : ourWordCount >= 1000 ? 0.1 : 0;
    const sourceBonus = sourceArticles.length >= 3 ? 0.1 : 0;
    const overallScore = Math.min(coverageWeighted + depthWeighted + lengthBonus + sourceBonus, 1);

    return { overallScore, coverageScore, depthScore, ourWordCount, avgSourceWordCount };
  } catch (err) {
    log(`  [Competitive Check] Error: ${err.message}`);
    return null;
  }
}

// Lock file to prevent concurrent runs
const LOCK_FILE = path.join(__dirname, ".orchestrator.lock");
const LOCK_STALE_MS = 30 * 60 * 1000; // 30 min

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
    if (age < LOCK_STALE_MS) {
      log(`Lock file exists (${Math.round(age / 1000)}s old). Another instance is running.`);
      return false;
    }
    log(`Stale lock file found (${Math.round(age / 1000)}s old). Removing.`);
  }
  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, started: new Date().toISOString() }));
    log("Lock acquired.");
    return true;
  } catch (err) {
    log(`Failed to write lock file: ${err.message}`);
    return false;
  }
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
    log("Lock released.");
  } catch (err) {
    log(`Failed to release lock: ${err.message}`);
  }
}

// Main orchestrator cycle
async function orchestratorCycle(state) {
  const startTime = Date.now();
  log("=== Orchestrator Cycle Start ===");

  // Check if we've hit daily quota
  if (state.articlesPublishedToday >= DAILY_QUOTA) {
    log(`Daily quota (${DAILY_QUOTA}) reached. Maintenance mode.`);
    // Still run watcher for report
    await checkAndApplyUnreadReport();
    log(`=== Cycle done (quota hit, ${Date.now() - startTime}ms) ===`);
    return;
  }

  // Phase 1: Research (every cycle)
  log("Phase 1: Research");
  const researchResult = await runResearch(RESEARCH_KEYWORDS);
  state.lastResearchDate = new Date().toISOString();
  saveState(state);

  const topics = researchResult.topics || researchResult;
  const sourceArticles = researchResult.sourceArticles || [];
  const clusters = researchResult.clusters || [];

  if (!Array.isArray(topics) || topics.length === 0) {
    log("No topics found. Retry next cycle.");
    log(`=== Cycle done (no topics, ${Date.now() - startTime}ms) ===`);
    return;
  }

  // Phase 2: SEO Analysis with CX context
  log("Phase 2: SEO Analysis");
  const existingTitles = getExistingTitles();
  const scored = await runSeoAnalysis({ topics }, existingTitles, sourceArticles);

  // Phase 3: Boss Approval
  log("Phase 3: Boss/CEO Approval");
  const approved = await runBoss(scored, {
    articlesToday: state.articlesPublishedToday,
    articlesTotal: existingTitles.length,
  });

  if (approved.length === 0) {
    log("No topics approved. Next cycle.");
    log(`=== Cycle done (none approved, ${Date.now() - startTime}ms) ===`);
    return;
  }

  // Phase 4: Generate article from top approved topic
  log("Phase 4: Article Generation");
  let filePath = null;

  for (const topic of approved.slice(0, 5)) {
    log(`  Trying: ${topic.topic?.title?.slice(0, 60)}...`);
    filePath = await generateFromTopic(topic, existingTitles, sourceArticles, clusters);
    if (filePath) break;
    log("  Failed, trying next approved topic.");
  }

  if (!filePath) {
    log("All approved topics failed generation.");
    log(`=== Cycle done (all gen failed, ${Date.now() - startTime}ms) ===`);
    return;
  }

  // Phase 4b: Quality Gate check
  log("Phase 4b: Quality Gate Check");
  let gateFailed = false;
  let gateResult = null;
  try {
    const { validateArticle } = await import("./lib/quality-gates.mjs");
    gateResult = validateArticle(filePath);
    if (!gateResult.passed) {
      log(`  QUALITY GATE FAILED — ${gateResult.failures.length} issues found`);
      for (const f of gateResult.failures.slice(0, 5)) {
        log(`    [${f.gate}] ${f.rule}: ${f.message}`);
      }
      if (gateResult.failures.length > 5) {
        log(`    ... and ${gateResult.failures.length - 5} more issues`);
      }
      log("  Article sent back for revision. Will retry next cycle.");
      const { appendToReport } = await import("./lib/report.mjs");
      const lines = [
        "## Quality Gate Rejection",
        `**Article:** ${path.basename(filePath)}`,
        `**Score:** ${gateResult.score}/100`,
        `**Failures:** ${gateResult.failures.length}`,
        ...gateResult.failures.map(f => `- [${f.gate}] ${f.rule}: ${f.message}`),
        "",
        "*Auto-generated by Quality Gates Agent*",
      ];
      appendToReport("Quality Gates", lines.join("\n"));
      gateFailed = true;
    } else {
      log(`  Quality gate PASSED (score: ${gateResult.score}/100)`);
    }
  } catch (err) {
    log(`  Quality gate check failed: ${err.message}`);
    log("  Proceeding without quality gate validation.");
  }

  if (gateFailed) {
    log(`=== Cycle done (quality gate failed, ${Date.now() - startTime}ms) ===`);
    return;
  }

  // Phase 4c: Competitive Check (does our article beat existing content?)
  log("Phase 4c: Competitive Check");
  const competitiveScore = await runCompetitiveCheck(filePath, sourceArticles);
  if (competitiveScore) {
    log(`  Competitive score: ${competitiveScore.overallScore.toFixed(2)}/1.00`);
    if (competitiveScore.overallScore < 0.6) {
      log("  Score too low. Skipping publish to regenerate with depth.");
      const { appendToReport } = await import("./lib/report.mjs");
      appendToReport("Competitive Check",
        `## Competitive Check Failed\n**Article:** ${path.basename(filePath)}\n**Score:** ${competitiveScore.overallScore.toFixed(2)}/1.00\n**Action:** Rejected — not competitive enough.`);
      log(`=== Cycle done (competitive check failed, ${Date.now() - startTime}ms) ===`);
      return;
    }
    log(`  Competitive check PASSED.`);
  } else {
    log("  Competitive check skipped (no source articles to compare).");
  }

  // Phase 5: Publish with 1-hour timestamp
  log("Phase 5: Publish");
  const publishHour = 10 + state.articlesPublishedToday; // 10:00, 11:00, etc.
  const dateStamp = `${todayStr().replace(/-/g, "-")}T${String(publishHour).padStart(2, "0")}:00:00 +0000`;

  // Read title from generated file instead of out-of-scope variable
  let publishTitle = "article";
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const titleMatch = fileContent.match(/title:\s*"(.+?)"/);
    if (titleMatch) publishTitle = titleMatch[1];
  } catch {}

  try {
    execSync(`git add "${filePath}"`, { cwd: ROOT_DIR });
    const env = { ...process.env, GIT_AUTHOR_DATE: dateStamp, GIT_COMMITTER_DATE: dateStamp };
    execSync(`git commit -m "Add: ${publishTitle.slice(0, 72)}"`, { cwd: ROOT_DIR, env });
    execSync("git push", { cwd: ROOT_DIR, env, timeout: 30000 });
    log(`  Published: ${path.basename(filePath)} at ${dateStamp}`);
    state.articlesPublishedToday++;
    state.lastPublishDate = new Date().toISOString();
    saveState(state);
  } catch (err) {
    log(`  Publish failed: ${err.message}`);
  }

  // Phase 6: Syndicate to Dev.to + LinkedIn + Medium
  try {
    await runSyndication();
  } catch (err) {
    log(`  Syndication to Dev.to failed: ${err.message}`);
  }

  try {
    const { runLinkedInSyndication } = await import("./lib/syndicate-linkedin.mjs");
    await runLinkedInSyndication();
  } catch (err) {
    log(`  LinkedIn syndication failed: ${err.message}`);
  }

  try {
    const { runMediumSyndication } = await import("./lib/syndicate-medium.mjs");
    await runMediumSyndication();
  } catch (err) {
    log(`  Medium syndication failed: ${err.message}`);
  }

  // Phase 7: Ping Google about the new article
  try {
    const { pingGoogleSitemap } = await import("./seo-agent/gsc-client.mjs");
    await pingGoogleSitemap();
  } catch (err) {
    log(`  Google ping failed: ${err.message}`);
  }

  // Watcher: check report
  await checkAndApplyUnreadReport();

  // Phase 8: Agent Checker — validate every phase of this cycle
  try {
    const { runAgentCheck } = await import("./lib/agent-checker.mjs");
    await runAgentCheck(state, {
      researchResult: { topics, sourceArticles, clusters },
      scored: scored || [],
      approved,
      filePath,
      gateResult,
    });
  } catch (err) {
    log(`  [Agent Checker] Error: ${err.message}`);
  }

  log(`=== Cycle done (${Date.now() - startTime}ms). Published: ${state.articlesPublishedToday}/${DAILY_QUOTA} ===`);
}

// SEO Audit runs once per day
async function seoAuditCycle(state) {
  const today = todayStr();
  const lastSeoAudit = state.lastSeoAuditDate || "";
  if (lastSeoAudit === today) return;

  log("[Orchestrator] Running Technical SEO Audit...");
  try {
    const { runAudit } = await import("./seo-agent/run.mjs");
    const result = await runAudit();
    state.lastSeoAuditDate = today;
    state.lastSeoScore = result.findings.filter(f => f.severity === "CRITICAL").length === 0
      ? Math.max(0, 100 - result.findings.filter(f => f.severity !== "INFO").length * 2)
      : 0;
    saveState(state);
    log(`[Orchestrator] SEO Audit complete. Health score: ${state.lastSeoScore}/100`);
  } catch (err) {
    log(`[Orchestrator] SEO Audit failed: ${err.message}`);
  }
}

// Marketing runs once per day
async function marketingCycle(state) {
  const today = todayStr();
  const lastMarketing = state.lastMarketingDate || "";
  if (lastMarketing === today) return;

  log("[Orchestrator] Running Marketing Agent...");
  try {
    await runMarketing();
    state.lastMarketingDate = today;
    saveState(state);
  } catch (err) {
    log(`[Orchestrator] Marketing failed: ${err.message}`);
  }
}

// Analytics runs once per day
async function analyticsCycle(state) {
  const today = todayStr();
  const lastRun = state.lastAnalyticsDate || "";
  if (lastRun === today) return;

  log("[Orchestrator] Running Analytics Agent...");
  try {
    const { runAnalytics } = await import("./analytics-agent.mjs");
    await runAnalytics();
    state.lastAnalyticsDate = today;
    saveState(state);
  } catch (err) {
    log(`[Orchestrator] Analytics failed: ${err.message}`);
  }
}

// Link Building runs once per day
async function linkBuildingCycle(state) {
  const today = todayStr();
  const lastRun = state.lastLinkBuildingDate || "";
  if (lastRun === today) return;

  log("[Orchestrator] Running Link Building Agent...");
  try {
    const { runLinkBuilding } = await import("./link-building-agent.mjs");
    await runLinkBuilding();
    state.lastLinkBuildingDate = today;
    saveState(state);
  } catch (err) {
    log(`[Orchestrator] Link Building failed: ${err.message}`);
  }
}

// Publish due scheduled posts
async function publishScheduledPosts() {
  try {
    const STATE_FILE = path.join(__dirname, "state.json");
    const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    if (!state.scheduledPosts?.length) return;

    const now = Date.now();
    const due = state.scheduledPosts.filter(p => p.status === "pending" && new Date(p.scheduledAt).getTime() <= now);
    if (!due.length) return;

    for (const post of due) {
      if (post.platform === "linkedin") {
        log(`[Scheduler] Publishing scheduled LinkedIn post: ${post.title?.slice(0, 60)}...`);
        try {
          const { publishToLinkedIn, generateLinkedInPost } = await import("./lib/syndicate-linkedin.mjs");
          const { parseArticle } = await import("./lib/syndication.mjs");
          const articlesDir = path.resolve(__dirname, "../../src/content/articles");
          const file = post.slug + ".mdx";
          let article = parseArticle(path.join(articlesDir, file));
          if (!article) {
            // Try finding the file by slug prefix
            const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx") && f.startsWith(post.slug));
            if (files.length > 0) article = parseArticle(path.join(articlesDir, files[0]));
          }
          if (article) {
            const linkedinPost = generateLinkedInPost(article);
            await publishToLinkedIn(linkedinPost);
            post.status = "published";
            post.publishedAt = new Date().toISOString();
            log(`[Scheduler] LinkedIn post published: ${post.title?.slice(0, 60)}...`);
          }
        } catch (err) {
          log(`[Scheduler] LinkedIn publish failed: ${err.message}`);
          post.status = "failed";
          post.error = err.message;
        }
      }
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    log(`[Scheduler] Error: ${err.message}`);
  }
}

// Watcher for report
async function watcherCycle() {
  try {
    await checkAndApplyUnreadReport();
    await publishScheduledPosts();
  } catch (err) {
    log(`[Watcher] Error: ${err.message}`);
  }
}

// Main loop
export async function runOrchestrator() {
  log("========================================");
  log("  PraveenTechWorld Orchestrator v1.0");
  log("========================================");
  log(`  Daily quota: ${DAILY_QUOTA} articles`);
  log(`  Cycle interval: ${RUN_EVERY_MS / 60000} min`);
  log("========================================");

  if (!acquireLock()) {
    log("Exiting — another instance is running.");
    return;
  }

  let state = loadState();

  // Check if it's a new day
  const lastPubDate = state.lastPublishDate ? state.lastPublishDate.split("T")[0] : "";
  if (lastPubDate !== todayStr()) {
    log("New day detected. Resetting counter.");
    state.articlesPublishedToday = 0;
    state.lastPublishDate = null;
    saveState(state);
  }

  log(`Resuming: ${state.articlesPublishedToday}/${DAILY_QUOTA} published today`);

  // Run daily cycles on start
  await marketingCycle(state);
  await seoAuditCycle(state);
  await analyticsCycle(state);
  await linkBuildingCycle(state);

  // Run first cycle immediately
  await orchestratorCycle(state);

  // Schedule cycles
  setInterval(async () => {
    state = loadState();
    await marketingCycle(state);
    await seoAuditCycle(state);
    await analyticsCycle(state);
    await linkBuildingCycle(state);
    await orchestratorCycle(state);
  }, RUN_EVERY_MS);

  // Watcher for report.md
  setInterval(async () => {
    await watcherCycle();
  }, WATCHER_EVERY_MS);

  // Heartbeat
  setInterval(() => {
    const mem = process.memoryUsage();
    log(`[Heartbeat] RSS: ${Math.round(mem.rss / 1024 / 1024)}MB | Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB`);
  }, 5 * 60 * 1000);

  // Graceful shutdown
  process.on("SIGINT", () => {
    log("\nShutting down gracefully...");
    saveState(loadState());
    releaseLock();
    log("State saved. Goodbye.");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    log("\nSIGTERM received. Saving state...");
    saveState(loadState());
    releaseLock();
    process.exit(0);
  });

  log("Orchestrator running. Press Ctrl+C to stop.");
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runOrchestrator().catch((err) => {
    console.error("Orchestrator crashed:", err);
    releaseLock();
    process.exit(1);
  });
}
