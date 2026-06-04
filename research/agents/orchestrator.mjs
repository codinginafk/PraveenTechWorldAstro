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
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const RESEARCH_DIR = path.resolve(__dirname, "../research");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const STATE_FILE = path.join(__dirname, "state.json");
const RESEARCH_KEYWORDS = "AI,privacy,security,productivity,Windows,Android,ChatGPT,career,automation,free,password,data,remove,tracking";

const DAILY_QUOTA = 5;
const RUN_EVERY_MS = 60 * 60 * 1000; // 1 hour
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

// Article generation from approved topic
async function generateFromTopic(topic, existingTitles) {
  log(`  Generating article: ${topic.topic?.title?.slice(0, 60)}...`);

  const title = topic.seoTitle || topic.topic?.title || "Untitled";
  const existing = existingTitles?.length || 0;
  const publishDate = new Date();
  const dateStr = publishDate.toISOString().split("T")[0];

  const result = await generateArticle({
    title: title,
    description: topic.topic?.snippet?.slice(0, 150) || `A practical guide to ${title.toLowerCase()}.`,
    category: topic.pillarFit || "ai-tools",
    tags: topic.recommendedTags?.length ? topic.recommendedTags : [topic.pillarFit || "ai-tools"],
    seoTitle: title.slice(0, 60),
    socialHook: topic.topic?.title?.slice(0, 120) || `Learn how to ${title.toLowerCase()}.`,
    publishDate: dateStr,
    depthInstruction: "Write 2500-3500 words. Go exceptionally deep with specific steps, examples, and actionable advice. Include a FAQ section at the end.",
  });

  return result;
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

  // Phase 1: Research (once per session unless empty)
  const lastResearch = state.lastResearchDate;
  const needsResearch = !lastResearch || !fs.existsSync(path.join(RESEARCH_DIR, "topics"));

  if (needsResearch) {
    log("Phase 1: Research");
    const topics = await runResearch(RESEARCH_KEYWORDS);
    state.lastResearchDate = new Date().toISOString();
    saveState(state);

    if (topics.length === 0) {
      log("No topics found. Retry next cycle.");
      log(`=== Cycle done (no topics, ${Date.now() - startTime}ms) ===`);
      return;
    }
  }

  // Phase 2: SEO Analysis
  log("Phase 2: SEO Analysis");
  const topicsDir = path.join(RESEARCH_DIR, "topics");
  const topicFiles = fs.readdirSync(topicsDir).filter((f) => f.endsWith(".json")).sort().reverse();
  if (topicFiles.length === 0) {
    log("No topic files. Will research next cycle.");
    log(`=== Cycle done (no files, ${Date.now() - startTime}ms) ===`);
    return;
  }
  const latestTopics = JSON.parse(fs.readFileSync(path.join(topicsDir, topicFiles[0]), "utf-8"));
  const existingTitles = getExistingTitles();
  const scored = await runSeoAnalysis(latestTopics, existingTitles);

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
  const topic = approved[0];
  const filePath = await generateFromTopic(topic, existingTitles);

  if (!filePath) {
    log("Generation failed. Trying next approved topic.");
    log(`=== Cycle done (gen failed, ${Date.now() - startTime}ms) ===`);
    return;
  }

  // Phase 5: Publish with 1-hour timestamp
  log("Phase 5: Publish");
  const publishHour = 10 + state.articlesPublishedToday; // 10:00, 11:00, etc.
  const dateStamp = `${todayStr().replace(/-/g, "-")}T${String(publishHour).padStart(2, "0")}:00:00 +0000`;

  try {
    execSync(`git add "${filePath}"`, { cwd: ROOT_DIR });
    const env = { ...process.env, GIT_AUTHOR_DATE: dateStamp, GIT_COMMITTER_DATE: dateStamp };
    const title = topic.seoTitle || topic.topic?.title || "article";
    execSync(`git commit -m "Add: ${title.slice(0, 72)}"`, { cwd: ROOT_DIR, env });
    execSync("git push", { cwd: ROOT_DIR, env, timeout: 30000 });
    log(`  Published: ${path.basename(filePath)} at ${dateStamp}`);
    state.articlesPublishedToday++;
    state.lastPublishDate = new Date().toISOString();
    saveState(state);
  } catch (err) {
    log(`  Publish failed: ${err.message}`);
  }

  // Watcher: check report
  await checkAndApplyUnreadReport();

  log(`=== Cycle done (${Date.now() - startTime}ms). Published: ${state.articlesPublishedToday}/${DAILY_QUOTA} ===`);
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

// Watcher for report
async function watcherCycle() {
  try {
    await checkAndApplyUnreadReport();
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

  let state = loadState();

  // Check if it's a new day
  const lastPubDate = state.lastPublishDate ? state.lastPublishDate.split("T")[0] : "";
  if (lastPubDate !== todayStr()) {
    log("New day detected. Resetting counter.");
    state.articlesPublishedToday = 0;
    state.lastPublishDate = null;
    state.lastResearchDate = null;
    saveState(state);
  }

  log(`Resuming: ${state.articlesPublishedToday}/${DAILY_QUOTA} published today`);

  // Run marketing on start
  await marketingCycle(state);

  // Run first cycle immediately
  await orchestratorCycle(state);

  // Schedule cycles
  setInterval(async () => {
    state = loadState();
    await marketingCycle(state);
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
    log("State saved. Goodbye.");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    log("\nSIGTERM received. Saving state...");
    saveState(loadState());
    process.exit(0);
  });

  log("Orchestrator running. Press Ctrl+C to stop.");
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runOrchestrator().catch((err) => {
    console.error("Orchestrator crashed:", err);
    process.exit(1);
  });
}
