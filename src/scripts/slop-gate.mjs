/**
 * slop-gate.mjs — content-diff slop gate for CI and local pre-PR checks.
 *
 * Finds articles changed vs origin/main (PR diff) or in the worktree (local),
 * scores each through the SlopDetector API, and FAILS (exit 1) when any
 * article scores combined >= 40 or the judge says likely_ai_raw (high).
 *
 * Infra failures (API down, rate-limited) WARN and pass open — a broken tool
 * must never block legitimate publishing. The weekly full-site audit is the
 * backstop. Set SKIP_SLOP_GATE=1 to bypass explicitly (logged).
 *
 * Usage:
 *   node src/scripts/slop-gate.mjs              # gate changed articles
 *   node src/scripts/slop-gate.mjs --file <path> # gate one file (testing / pre-check)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARTICLES = path.join(ROOT, "src/content/articles");
const API = process.env.SLOP_API_URL || "https://slopdetector.praveentechworld.com/api/analyze";
const FAIL_SCORE = 40;
const MAX_FILES = 10;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.env.SKIP_SLOP_GATE === "1") {
  console.log("⚠️  SLOP_GATE skipped via SKIP_SLOP_GATE=1 (recorded bypass)");
  process.exit(0);
}

function sh(cmd) {
  try { return execSync(cmd, { cwd: ROOT, stdio: "pipe" }).toString().trim(); }
  catch { return ""; }
}

function changedArticles() {
  const fi = process.argv.indexOf("--file");
  if (fi !== -1) {
    if (!process.argv[fi + 1]) { console.error("❌ --file needs a path argument"); process.exit(2); }
    const full = path.resolve(ROOT, process.argv[fi + 1]);
    if (!fs.existsSync(full)) { console.error(`❌ file not found: ${process.argv[fi + 1]}`); process.exit(2); }
    return [full];
  }
  const set = new Set();
  // 1) PR/branch diff vs origin/main (what CI sees)
  const diff = sh("git diff --name-only origin/main...HEAD");
  // 2) worktree changes (local dev, uncommitted work)
  const status = sh("git status --porcelain");
  for (const line of (diff + "\n" + status).split("\n")) {
    const f = line.trim().replace(/^[A-Z?! ]+\s+/, "").replace(/^"|"$/g, "");
    if (/^src\/content\/articles\/.*\.mdx?$/.test(f)) {
      const full = path.resolve(ROOT, f);
      if (fs.existsSync(full)) set.add(full);
    }
  }
  return [...set].slice(0, MAX_FILES);
}

function bodyText(raw) {
  const noFm = raw.replace(/^---[\s\S]*?---/, "");
  const noCode = noFm.replace(/```[\s\S]*?```/g, "\n").replace(/~~~[\s\S]*?~~~/g, "\n");
  return noCode.replace(/[#>*_\[\]()|~]/g, " ").replace(/\s+/g, " ").trim();
}

function frontmatter(raw) {
  const m = raw.match(/^---([\s\S]*?)---/);
  const fm = (m ? m[1] : "").trim();
  const g = (k) => {
    const mm = fm.match(new RegExp("^" + k + ':\\s*"?([^"\\n]+)"?', "m"));
    return mm ? mm[1].trim() : "";
  };
  return { title: g("title"), description: g("description") };
}

async function score(text) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90000);
  try {
    const r = await fetch(API, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 60000) }), signal: ctrl.signal,
    });
    clearTimeout(t);
    const d = await r.json();
    if (!r.ok) return { infra: true, detail: `HTTP ${r.status}: ${(d.error || "").slice(0, 80)}` };
    return d;
  } catch (e) {
    clearTimeout(t);
    return { infra: true, detail: e.message.slice(0, 80) };
  }
}

const files = changedArticles();
if (!files.length) {
  console.log("✅ Slop-Gate: no article changes detected — skipped.");
  process.exit(0);
}
console.log(`🔍 Slop-Gate: scoring ${files.length} changed article(s)...`);

const failures = [], warnings = [];
let i = 0;
for (const f of files) {
  i++;
  if (i > 1) await sleep(6000);
  const rel = path.relative(ROOT, f);
  const raw = fs.readFileSync(f, "utf8");
  const fm = frontmatter(raw);
  // cheap local checks (warnings only — Google truncates, doesn't penalize)
  if (fm.title && fm.title.length > 60) warnings.push(`${rel}: title ${fm.title.length} chars (>60, will truncate in SERP)`);
  if (fm.description && fm.description.length > 160) warnings.push(`${rel}: description ${fm.description.length} chars (>160, will truncate)`);
  const text = bodyText(raw);
  if (text.split(/\s+/).length < 40) { warnings.push(`${rel}: body under 40 words — judge skipped, heuristic only`); }
  const d = await score(text);
  if (d.infra) { warnings.push(`${rel}: judge unavailable (${d.detail}) — heuristic-only pass, re-check in weekly audit`); continue; }
  const j = d.judge;
  if (!j && d.judgeError) warnings.push(`${rel}: semantic judge skipped (${String(d.judgeError).slice(0, 90)}) — heuristic-only verdict`);
  const line = `${rel}: combined=${d.combined.score} (${d.combined.grade}) heur=${d.heuristic.score} judge=${j ? `${j.ai_likelihood} ${j.bucket} ${j.confidence}` : "none"}`;
  console.log("   " + line);
  if (j) console.log("      tells: " + (j.tells || []).slice(0, 3).join(" | "));
  if (d.combined.score >= FAIL_SCORE) failures.push(`${rel}: combined ${d.combined.score} ≥ ${FAIL_SCORE}`);
  else if (j && j.bucket === "likely_ai_raw" && j.confidence === "high") failures.push(`${rel}: judge likely_ai_raw (high confidence)`);
}

for (const w of warnings) console.log("⚠️  " + w);
if (failures.length) {
  console.error("\n❌ SLOP-GATE FAILED:");
  failures.forEach((x) => console.error("   - " + x));
  console.error("Fix flagged voice (concrete details over generic padding, cut tell phrases) and re-run.");
  process.exit(1);
}
console.log(`\n✅ Slop-Gate passed: ${files.length} article(s) under threshold.`);
