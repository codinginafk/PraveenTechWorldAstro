import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log, ensureDir } from "./shared.mjs";
import { appendToReport } from "./report.mjs";
import { loadMemory } from "./topic-memory.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const STATE_FILE = path.join(__dirname, "..", "state.json");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const REPORTS_DIR = path.resolve(__dirname, "../../reports");
const RESEARCH_DIR = path.resolve(__dirname, "../../research");

const GARBAGE_PATTERNS = [
  /^list of\s/i,
  /^category:/i,
  /^template:/i,
  /^help:/i,
  /^user:/i,
  /^file:/i,
  /^wikipedia/i,
  /^wikidata/i,
  /^\d{6,}$/,
  /^[^a-z0-9]{8,}$/i,
  /&#?\w+;/,
  /\\u[\da-f]{4}/i,
];

function isGarbageKey(key) {
  if (!key || key.length < 5) return true;
  if (GARBAGE_PATTERNS.some((p) => p.test(key))) return true;
  const clean = key.replace(/[^\w\s]/g, "").trim();
  if (clean.length < 4) return true;
  return false;
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function getArticleCount() {
  if (!fs.existsSync(ARTICLES_DIR)) return 0;
  return fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx")).length;
}

function getReportAgeHours() {
  const reportPath = path.join(REPORTS_DIR, "report.md");
  if (!fs.existsSync(reportPath)) return Infinity;
  return (Date.now() - fs.statSync(reportPath).mtimeMs) / 3600000;
}

// ── State Health ──────────────────────────────────────────────

function checkStateHealth(state) {
  const issues = [];
  const warnings = [];

  const memory = state.topicMemory;
  if (!memory) {
    warnings.push("state.json has no topicMemory key");
    return { issues, warnings, pruned: 0 };
  }

  const entries = Object.entries(memory);
  let pruned = 0;

  for (const [key, entry] of entries) {
    if (isGarbageKey(key)) {
      delete memory[key];
      pruned++;
      continue;
    }

    if (!entry.firstSeen || !entry.velocity === undefined) {
      issues.push(`Corrupt memory entry: "${key.slice(0, 50)}" — missing fields`);
      continue;
    }

    const ageDays = (Date.now() - new Date(entry.firstSeen).getTime()) / 86400000;
    if (ageDays > 7 && (entry.velocity || 0) < 3) {
      delete memory[key];
      pruned++;
    }
  }

  if (pruned > 0) {
    state.topicMemory = memory;
    state.lastPrune = new Date().toISOString();
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch {}
  }

  if (pruned > 0) warnings.push(`Pruned ${pruned} stale/garbage topicMemory entries`);

  const totalKeys = Object.keys(memory).length;
  if (totalKeys > 200) warnings.push(`topicMemory has ${totalKeys} entries — consider tighter TTL`);

  if (state.articlesPublishedToday === undefined) issues.push("state missing articlesPublishedToday");
  if (state.dailyQuota === undefined) issues.push("state missing dailyQuota");

  return { issues, warnings, pruned };
}

// ── Research Output ──────────────────────────────────────────

function checkResearchOutput(researchResult) {
  const issues = [];

  if (!researchResult) return { issues: ["researchResult is null/undefined"], warnings: [] };

  const topics = researchResult.topics || [];
  const sourceArticles = researchResult.sourceArticles || [];
  const clusters = researchResult.clusters || [];

  if (!Array.isArray(topics)) issues.push("researchResult.topics is not an array");
  else if (topics.length === 0) issues.push("researchResult.topics is empty");
  else {
    const missingTitle = topics.filter((t) => !t.title && !t.topic?.title);
    if (missingTitle.length > topics.length * 0.5) issues.push(`${missingTitle.length}/${topics.length} topics missing title`);
    const missingSnippet = topics.filter((t) => !t.snippet && !t.topic?.snippet);
    if (missingSnippet.length > topics.length * 0.5) issues.push(`${missingSnippet.length}/${topics.length} topics missing snippet`);
    const dupes = new Set(topics.map((t) => (t.title || t.topic?.title || "").toLowerCase()));
    if (dupes.size < topics.length * 0.8) issues.push(`High title duplication — ${dupes.size} unique / ${topics.length} total`);
  }

  if (!Array.isArray(sourceArticles)) issues.push("researchResult.sourceArticles is not an array");
  if (!Array.isArray(clusters)) issues.push("researchResult.clusters is not an array");

  return { issues, warnings: [] };
}

// ── SEO Analysis ─────────────────────────────────────────────

function checkSeoAnalysis(scored) {
  const issues = [];

  if (!scored) return { issues: ["scored topics is null/undefined"], warnings: [] };
  if (!Array.isArray(scored)) return { issues: ["scored is not an array"], warnings: [] };
  if (scored.length === 0) return { issues: ["scored topics array is empty"], warnings: [] };

  const missingScore = scored.filter((s) => s.overallScore === undefined || s.overallScore === null);
  if (missingScore.length > 0) issues.push(`${missingScore.length}/${scored.length} topics missing overallScore`);

  const lowScore = scored.filter((s) => s.overallScore < 7);
  if (lowScore.length === scored.length) issues.push("ALL topics scored below 7 — threshold too high or data bad");

  const missingPillar = scored.filter((s) => !s.pillarFit || s.pillarFit === "unknown");
  if (missingPillar.length > scored.length * 0.5) issues.push(`${missingPillar.length}/${scored.length} topics missing pillarFit`);

  const missingCx = scored.filter((s) => !s.cxResults || s.cxResults.length === 0);
  if (missingCx.length > scored.length * 0.5) issues.push(`${missingCx.length}/${scored.length} topics have no CX results`);

  return { issues, warnings: [] };
}

// ── Boss Approval ────────────────────────────────────────────

function checkBossApproval(approved) {
  const issues = [];

  if (!approved) return { issues: ["approved topics is null/undefined"], warnings: [] };
  if (!Array.isArray(approved)) return { issues: ["approved is not an array"], warnings: [] };
  if (approved.length === 0) return { issues: ["No topics approved by Boss"], warnings: [] };

  const validPillars = ["ai-tools", "ai-workflows", "productivity", "windows-fixes", "android-fixes", "career-growth", "automation", "privacy", "security", "free-software"];
  const invalidPillar = approved.filter((a) => a.pillarFit && !validPillars.includes(a.pillarFit));
  if (invalidPillar.length > 0) issues.push(`${invalidPillar.length} approved topics have invalid pillarFit: ${invalidPillar.map((a) => a.pillarFit).join(", ")}`);

  if (approved.length > 2) issues.push(`Approved ${approved.length} topics — expected max 2`);

  return { issues, warnings: [] };
}

// ── Generation ───────────────────────────────────────────────

function checkGeneration(filePath) {
  const issues = [];

  if (!filePath) return { issues: ["No file was generated — filePath is null"], warnings: [] };

  if (!fs.existsSync(filePath)) issues.push(`Generated file does not exist on disk: ${filePath}`);
  else {
    const content = fs.readFileSync(filePath, "utf-8");
    const bodyMatch = content.match(/---[\s\S]*?---\s*([\s\S]*)/);
    if (!bodyMatch) issues.push("Generated file has no body content after frontmatter");
    else {
      const body = bodyMatch[1];
      const wordCount = body.split(/\s+/).filter(Boolean).length;
      if (wordCount < 500) issues.push(`Generated article is too short: ${wordCount} words (min 500)`);

      const frontmatter = content.match(/---\n([\s\S]*?)\n---/);
      if (frontmatter) {
        const fm = frontmatter[1];
        if (!fm.includes("title:")) issues.push("Frontmatter missing title");
        if (!fm.includes("description:")) issues.push("Frontmatter missing description");
        if (!fm.includes("coverImage:")) issues.push("Frontmatter missing coverImage");
      }
    }

    const slugMatch = filePath.match(/([^/\\]+)\.mdx$/);
    if (slugMatch) {
      const slug = slugMatch[1];
      const content = fs.readFileSync(filePath, "utf-8");
      const titleMatch = content.match(/title:\s*"(.+?)"/);
      if (titleMatch) {
        const expectedSlug = titleMatch[1].toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
        if (slug !== expectedSlug) issues.push(`Slug mismatch: file is "${slug}", expected "${expectedSlug}"`);
      }
    }
  }

  return { issues, warnings: [] };
}

// ── Quality Gate ─────────────────────────────────────────────

function checkQualityGate(gateResult) {
  const issues = [];

  if (!gateResult) return { issues: ["No quality gate result"], warnings: [] };

  if (gateResult.passed === false) {
    const failures = gateResult.failures || [];
    const top5 = failures.slice(0, 5).map((f) => `${f.gate}: ${f.message}`);
    issues.push(`Quality gate FAILED (score ${gateResult.score}/100) — ${failures.length} issues`);
    if (top5.length > 0) issues.push(...top5.map((m) => `  ${m}`));
  }

  return { issues, warnings: [] };
}

// ── Syndication ──────────────────────────────────────────────

function checkSyndication(state) {
  const issues = [];
  const warnings = [];

  const syndicated = state.syndicated || [];
  if (syndicated.length === 0) return { issues: [], warnings: ["No articles have been syndicated yet"] };

  for (const file of syndicated) {
    const filePath = path.join(ARTICLES_DIR, file);
    if (!fs.existsSync(filePath)) {
      warnings.push(`Syndication record references missing file: ${file}`);
    }
  }

  return { issues, warnings };
}

// ── Cross-Agent Data Flow ────────────────────────────────────

function checkCrossAgentFlow(cycleData) {
  const issues = [];
  const warnings = [];

  const { researchResult, scored, approved, filePath, gateResult } = cycleData;

  if (researchResult && scored) {
    const researchTopics = researchResult.topics || [];
    if (researchTopics.length > 0 && scored.length === 0) {
      issues.push("Research produced topics but SEO Analysis returned 0 scored — data flow break");
    }
  }

  if (scored && approved) {
    if (scored.length > 0 && approved.length === 0) {
      const allBelow7 = scored.every((s) => (s.overallScore || 0) < 6);
      if (allBelow7) warnings.push("All topics scored <6 — pipeline blocked, consider lowering threshold");
      else issues.push("SEO Analysis returned valid scores but Boss approved 0 — check boss-agent.mjs pillar balance logic");
    }
  }

  if (approved && filePath) {
    if (approved.length > 0 && !filePath) {
      issues.push("Boss approved topics but generation produced no file — check generate.mjs");
    }
  }

  if (filePath && gateResult) {
    if (filePath && gateResult && !gateResult.passed) {
      warnings.push("Article failed quality gates — should have been caught before publish");
    }
  }

  return { issues, warnings };
}

// ── Report Freshness ─────────────────────────────────────────

function checkReportFreshness() {
  const issues = [];
  const hours = getReportAgeHours();
  if (hours > 24) issues.push(`report.md is ${Math.round(hours)}h old — stale`);
  return { issues, warnings: hours > 12 ? [`report.md last updated ${Math.round(hours)}h ago`] : [] };
}

// ── Article Consistency ──────────────────────────────────────

function checkArticleConsistency() {
  const issues = [];
  const warnings = [];

  if (!fs.existsSync(ARTICLES_DIR)) {
    warnings.push("Articles directory does not exist yet");
    return { issues, warnings };
  }

  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx"));
  let missingCategory = 0;
  let missingTitle = 0;
  let invalidFm = 0;

  for (const file of files) {
    const content = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf-8");
    if (!content.startsWith("---")) { invalidFm++; continue; }
    if (!content.includes("title:")) missingTitle++;
    if (!content.includes("category:")) missingCategory++;
  }

  if (missingTitle > 0) issues.push(`${missingTitle}/${files.length} articles missing title in frontmatter`);
  if (missingCategory > 0) issues.push(`${missingCategory}/${files.length} articles missing category in frontmatter`);
  if (invalidFm > 0) issues.push(`${invalidFm}/${files.length} articles have invalid frontmatter (no --- start)`);

  return { issues, warnings };
}

// ── Main Export ──────────────────────────────────────────────

export async function runAgentCheck(state, cycleData = {}) {
  log("[Agent Checker] Starting validation...");

  const allIssues = [];
  const allWarnings = [];

  const checks = [
    { name: "State Health", result: checkStateHealth(state) },
    { name: "Research Output", result: checkResearchOutput(cycleData.researchResult) },
    { name: "SEO Analysis", result: checkSeoAnalysis(cycleData.scored) },
    { name: "Boss Approval", result: checkBossApproval(cycleData.approved) },
    { name: "Generation", result: checkGeneration(cycleData.filePath) },
    { name: "Quality Gates", result: checkQualityGate(cycleData.gateResult) },
    { name: "Syndication", result: checkSyndication(state) },
    { name: "Cross-Agent Flow", result: checkCrossAgentFlow(cycleData) },
    { name: "Report Freshness", result: checkReportFreshness() },
    { name: "Article Consistency", result: checkArticleConsistency() },
  ];

  for (const check of checks) {
    for (const issue of check.result.issues) {
      allIssues.push({ check: check.name, message: issue });
      log(`  [CHECK FAIL] ${check.name}: ${issue}`);
    }
    for (const warning of check.result.warnings) {
      allWarnings.push({ check: check.name, message: warning });
      log(`  [CHECK WARN] ${check.name}: ${warning}`);
    }
  }

  // Append to report.md
  const lines = [
    `## Agent Checker — ${new Date().toISOString()}`,
    `**Status:** ${allIssues.length === 0 ? "ALL CLEAN" : `${allIssues.length} issue(s) found`}`,
    "",
  ];

  if (allIssues.length > 0) {
    lines.push("### Issues");
    for (const issue of allIssues) {
      lines.push(`- ❌ [${issue.check}] ${issue.message}`);
    }
    lines.push("");
  }

  if (allWarnings.length > 0) {
    lines.push("### Warnings");
    for (const warn of allWarnings) {
      lines.push(`- ⚠️ [${warn.check}] ${warn.message}`);
    }
    lines.push("");
  }

  if (allIssues.length === 0 && allWarnings.length === 0) {
    lines.push("All checks passed with no warnings.");
  }

  lines.push("*Auto-generated by Agent Checker*");

  appendToReport("Agent Checker", lines.join("\n"));

  log(`[Agent Checker] Done. ${allIssues.length} issues, ${allWarnings.length} warnings.`);
  return { issues: allIssues, warnings: allWarnings, passed: allIssues.length === 0 };
}

// ── Full Standalone Check ────────────────────────────────────

export async function runFullCheck() {
  log("[Agent Checker] Running full standalone check...");

  const state = loadState();
  const issueCounts = { total: 0, byCheck: {} };

  // State health
  const stateResult = checkStateHealth(state);
  if (stateResult.pruned > 0) log(`  Pruned ${stateResult.pruned} stale entries from state.json`);

  // Article consistency
  const articleResult = checkArticleConsistency();

  // Check all generated files
  let genDirIssues = [];
  if (fs.existsSync(ARTICLES_DIR)) {
    const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx"));
    for (const file of files) {
      const result = checkGeneration(path.join(ARTICLES_DIR, file));
      genDirIssues.push(...result.issues);
    }
  }

  // Check state for syndication issues
  const syndResult = checkSyndication(state);

  // Check report freshness
  const reportResult = checkReportFreshness();

  // Compile all
  const all = [
    ...stateResult.issues,
    ...stateResult.warnings,
    ...articleResult.issues,
    ...articleResult.warnings,
    ...genDirIssues,
    ...syndResult.issues,
    ...syndResult.warnings,
    ...reportResult.issues,
    ...reportResult.warnings,
  ];

  log("=== Full Check Results ===");
  if (all.length === 0) {
    log("  ALL CLEAN — no issues found");
  } else {
    for (const msg of all) log(`  ${msg}`);
  }

  // Write detailed report
  const reportPath = path.join(REPORTS_DIR, "agent-checker-report.md");
  ensureDir(REPORTS_DIR);
  const md = [
    "# Agent Checker — Full Report",
    `**Date:** ${new Date().toISOString()}`,
    `**Status:** ${all.length === 0 ? "✅ ALL CLEAN" : `⚠️ ${all.length} item(s)`}`,
    "",
    ...(all.length > 0 ? all.map((m) => `- ${m}`) : ["- No issues detected"]),
    "",
    "---",
    "*Auto-generated by Agent Checker*",
  ].join("\n");
  fs.writeFileSync(reportPath, md, "utf-8");
  log(`  Report: ${reportPath}`);

  return { passed: all.length === 0, items: all, reportPath };
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] || "full";
  if (cmd === "full") {
    runFullCheck().catch(console.error);
  } else if (cmd === "cycle") {
    const state = loadState();
    const cycleData = {};
    runAgentCheck(state, cycleData).catch(console.error);
  }
}
