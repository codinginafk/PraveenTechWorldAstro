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

// ─── System Health Checks ────────────────────────────────────────────────────

function checkBuildHealth() {
  const result = { status: "ok", detail: "" };
  try {
    const output = execSync("npx astro build", { cwd: ROOT_DIR, stdio: "pipe", timeout: 60000, encoding: "utf-8" });
    const pageMatch = output.match(/(\d+) page\(s\) built/);
    const timeMatch = output.match(/Completed in ([\d.]+)s/);
    const pageCount = pageMatch ? pageMatch[1] : "?";
    const buildTime = timeMatch ? timeMatch[1] : "?";
    if (output.includes("ERROR") || output.includes("error")) {
      result.status = "warning";
      result.detail = `${pageCount} pages, ${buildTime}s, but with warnings/errors`;
    } else {
      result.detail = `${pageCount} pages, ${buildTime}s, 0 errors`;
    }
  } catch (e) {
    result.status = "fail";
    result.detail = `Build failed: ${e.message?.slice(0, 120) || "unknown error"}`;
  }
  return result;
}

function checkYamlFrontmatter() {
  const issues = [];
  const files = fs.existsSync(ARTICLES_DIR) ? fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx")) : [];
  let fixed = 0;
  for (const file of files) {
    const fp = path.join(ARTICLES_DIR, file);
    let mdx = fs.readFileSync(fp, "utf-8");
    const normalized = normalizeEOL(mdx);
    const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) { issues.push(`${file}: no frontmatter`); continue; }
    const raw = fmMatch[1];
    const lines = raw.split("\n");
    const clean = [];
    for (const line of lines) {
      if (/^\w+:/.test(line) || /^\s+- /.test(line) || /^\s+\w+:/.test(line) || line.trim() === "") {
        clean.push(line);
      }
    }
    if (clean.length !== lines.length) {
      const stripped = lines.length - clean.length;
      const newFm = "---\n" + clean.join("\n") + "\n---\n" + normalized.slice(fmMatch[0].length);
      fs.writeFileSync(fp, newFm, "utf-8");
      issues.push(`${file}: stripped ${stripped} orphan line(s)`);
      fixed++;
    }
    // Validate required fields exist
    const fm = {};
    for (const line of clean) {
      const kv = line.match(/^(\w+):\s*(.*)/);
      if (kv) fm[kv[1]] = kv[2].replace(/^"(.*)"$/, "$1").trim();
    }
    if (!fm.title) issues.push(`${file}: missing title`);
    if (!fm.publishDate) issues.push(`${file}: missing publishDate`);
    if (!fm.category) issues.push(`${file}: missing category`);
  }
  const summary = `${files.length} articles, ${fixed} auto-fixed, ${issues.filter(i => !i.includes("stripped")).length} issues`;
  return { summary, issues, fixed };
}

function checkImageSources() {
  const files = fs.existsSync(ARTICLES_DIR) ? fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx")) : [];
  let unsplash = 0, commons = 0, other = 0, none = 0;
  for (const file of files) {
    const c = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf-8");
    const m = c.match(/coverImage:\s*"([^"]+)"/);
    if (!m) { none++; continue; }
    const url = m[1];
    if (url.includes("unsplash")) unsplash++;
    else if (url.includes("wikimedia")) commons++;
    else other++;
  }
  return { unsplash, commons, other, none, total: files.length, detail: `Unsplash: ${unsplash}, Commons: ${commons}, Other: ${other}, None: ${none}` };
}

function checkModuleHealth() {
  const issues = [];
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) issues.push(".env file missing");
  const articlesDir = fs.existsSync(ARTICLES_DIR);
  if (!articlesDir) issues.push("articles directory missing");
  if (fs.existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      if (!state.dailyQuota) issues.push("state.json missing dailyQuota");
    } catch { issues.push("state.json is invalid JSON"); }
  } else {
    issues.push("state.json missing");
  }
  const dirs = [ROOT_DIR, path.join(ROOT_DIR, "src"), path.join(ROOT_DIR, "src/content")];
  for (const d of dirs) { if (!fs.existsSync(d)) issues.push(`directory missing: ${d}`); }
  return { ok: issues.length === 0, issues, detail: issues.length ? issues.join("; ") : "All checks passed" };
}

function checkOrphanCleanup() {
  const dirs = [
    path.join(RESEARCH_DIR, "research", "approved"),
    path.join(RESEARCH_DIR, "research", "competitive"),
    path.join(RESEARCH_DIR, "reports", "batch-logs"),
  ];
  let deleted = 0;
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      const stat = fs.statSync(fp);
      if (now - stat.mtimeMs > maxAge) {
        fs.rmSync(fp);
        deleted++;
      }
    }
  }
  return { deleted, detail: deleted ? `Deleted ${deleted} old file(s)` : "No orphan files" };
}

function checkUnsplashRateLimit() {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  return { keyPresent: !!key, detail: key ? "Key present in env" : "UNSPLASH_ACCESS_KEY not set" };
}

async function runSystemHealth() {
  log("[Marketing Agent] Running system health checks...");
  const lines = [];
  const checks = [];

  // 1. Build health
  const build = checkBuildHealth();
  const icon = build.status === "ok" ? "✅" : build.status === "warning" ? "⚠️" : "❌";
  lines.push(`- ${icon} Build: ${build.detail}`);
  checks.push({ name: "build", ok: build.status === "ok" });

  // 2. YAML frontmatter
  const yaml = checkYamlFrontmatter();
  const yamlIcon = yaml.fixed > 0 || yaml.issues.length > 0 ? "⚠️" : "✅";
  lines.push(`- ${yamlIcon} YAML: ${yaml.summary}`);
  for (const i of yaml.issues) lines.push(`  - ${i}`);
  checks.push({ name: "yaml", ok: yaml.fixed === 0 && yaml.issues.length === 0 });

  // 3. Image sources
  const imgs = checkImageSources();
  const imgIcon = imgs.unsplash === imgs.total ? "✅" : imgs.unsplash > 0 ? "⚠️" : "❌";
  lines.push(`- ${imgIcon} Images: ${imgs.detail}`);
  checks.push({ name: "images", ok: imgs.unsplash === imgs.total });

  // 4. Module health
  const mod = checkModuleHealth();
  const modIcon = mod.ok ? "✅" : "❌";
  lines.push(`- ${modIcon} Modules: ${mod.detail}`);
  checks.push({ name: "modules", ok: mod.ok });

  // 5. Orphan cleanup
  const orphan = checkOrphanCleanup();
  const orphanIcon = orphan.deleted === 0 ? "✅" : "⚠️";
  lines.push(`- ${orphanIcon} Orphans: ${orphan.detail}`);
  checks.push({ name: "orphans", ok: orphan.deleted === 0 });

  // 6. Unsplash rate limit
  const rate = checkUnsplashRateLimit();
  const rateIcon = rate.keyPresent ? "✅" : "❌";
  lines.push(`- ${rateIcon} Unsplash API: ${rate.detail}`);
  checks.push({ name: "unsplash", ok: rate.keyPresent });

  const allOk = checks.every(c => c.ok);
  const statusLine = allOk ? "✅ All system checks passed" : "⚠️ Some issues detected";
  const content = `**Generated:** ${new Date().toISOString()}\n\n**Status:** ${statusLine}\n\n${lines.join("\n")}\n\n*System health auto-checked by Marketing Agent*`;

  appendToReport("System Health (Marketing Agent)", content);

  // Re-build if any auto-fixes were applied
  if (yaml.fixed > 0 || orphan.deleted > 0) {
    log("[Marketing Agent] Auto-fixes applied, re-verifying build...");
    try {
      execSync("npx astro build", { cwd: ROOT_DIR, stdio: "pipe", timeout: 60000 });
      log("[Marketing Agent] Build verified after auto-fix");
    } catch (e) {
      log(`[Marketing Agent] Build failed after auto-fix: ${e.message}`);
      // No revert needed - YAML strip is safe, orphan delete is cosmetic
    }
  }

  return { checks, allOk };
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
