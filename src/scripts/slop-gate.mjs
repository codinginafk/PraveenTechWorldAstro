/**
 * slop-gate.mjs — content-diff slop gate for CI and local pre-PR checks.
 *
 * Finds articles changed vs origin/main (PR diff) or in the worktree (local),
 * scores each through the SlopDetector API, and FAILS (exit 1) when any
 * article scores combined >= 40 or the judge says likely_ai_raw (high).
 *
 * The judge is fed the ADDED text of the diff, not the whole article. Scoring
 * the whole body meant that a one-line link repair re-judged ~1,500 words of
 * legacy prose and could fail CI for text the commit never touched.
 *
 * Skips are decided by CONTENT, not by diff size: a change is mechanical only
 * when every removed line matches an added line after blanking link/asset
 * URLs. A short but substantive edit falls back to judging the whole file, so
 * brief insertions cannot slip past the judge.
 *
 * Infra failures (API down, rate-limited) WARN and pass open — a broken tool
 * must never block legitimate publishing. The weekly full-site audit is the
 * backstop. Set SKIP_SLOP_GATE=1 to bypass explicitly (logged).
 *
 * Usage:
 *   node src/scripts/slop-gate.mjs              # gate changed articles
 *   node src/scripts/slop-gate.mjs --file <path> # gate one file in full (testing / pre-check)
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
// Fewer added prose words than this cannot meaningfully change a voice verdict.
const MIN_JUDGE_WORDS = 40;
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
  return [...set];
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

function gitBase() {
  return sh("git rev-parse --verify origin/main") ? "origin/main" : "HEAD";
}

function diffFor(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  return sh(`git diff --unified=0 ${gitBase()} -- "${rel}"`);
}

/**
 * Text this commit actually added to an article.
 * Untracked files have no origin/main counterpart, so their whole body counts.
 */
function addedText(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const tracked = sh(`git ls-files --error-unmatch "${rel}"`) !== "";
  if (!tracked) return fs.readFileSync(file, "utf8");

  const diff = diffFor(file);
  if (!diff) return "";
  return diff
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
    .map((l) => l.slice(1))
    .join("\n");
}

/**
 * A mechanical edit changes only link targets / asset paths, never prose.
 * Compare every removed line with every added line after blanking URLs: if the
 * two multisets match, no wording entered or left the article.
 *
 * This is deliberately stricter than "few added words". A word-count bypass let
 * an author slip short AI-voiced insertions into an existing article and dodge
 * the judge entirely; a URL-only comparison cannot be fooled that way, because
 * any added sentence changes a normalised line.
 */
function isMechanicalChange(file) {
  const diff = diffFor(file);
  if (!diff) return false;

  const normalise = (line) =>
    line
      .replace(/\]\([^)]*\)/g, "](L)")
      .replace(/(href|src)="[^"]*"/g, '$1="L"')
      .replace(/\s+/g, " ")
      .trim();

  const removed = [];
  const added = [];
  for (const line of diff.split("\n")) {
    if (/^(diff |index |--- |\+\+\+ |@@)/.test(line)) continue;
    if (line.startsWith("-")) removed.push(normalise(line.slice(1)));
    else if (line.startsWith("+")) added.push(normalise(line.slice(1)));
  }

  if (!removed.length) return false; // pure addition — always judged
  if (!added.length) return true; // pure deletion — nothing new to judge
  return removed.sort().join("\n") === added.sort().join("\n");
}

const files = changedArticles();
if (!files.length) {
  console.log("✅ Slop-Gate: no article changes detected — skipped.");
  process.exit(0);
}
console.log(`🔍 Slop-Gate: scoring ${files.length} changed article(s)...`);

const failures = [], warnings = [];
const wholeFileMode = process.argv.includes("--file");
let i = 0;
let skipped = 0;
let judged = 0;
const overCap = [];
for (const f of files) {
  i++;
  const rel = path.relative(ROOT, f);
  const raw = fs.readFileSync(f, "utf8");
  const fm = frontmatter(raw);
  // cheap local checks (warnings only — Google truncates, doesn't penalize)
  if (fm.title && fm.title.length > 60) warnings.push(`${rel}: title ${fm.title.length} chars (>60, will truncate in SERP)`);
  if (fm.description && fm.description.length > 160) warnings.push(`${rel}: description ${fm.description.length} chars (>160, will truncate)`);

  let text = bodyText(wholeFileMode ? raw : addedText(f));
  let words = text.split(/\s+/).filter(Boolean).length;

  if (!wholeFileMode && isMechanicalChange(f)) {
    skipped++;
    console.log(`   ${rel}: link/asset-target edit only (no prose changed) — judge skipped`);
    continue;
  }
  if (!wholeFileMode && words < MIN_JUDGE_WORDS) {
    // A short but substantive edit: judge the whole file so a 20-word
    // insertion cannot hide behind a small diff.
    text = bodyText(raw);
    words = text.split(/\s+/).filter(Boolean).length;
    console.log(`   ${rel}: small non-mechanical edit — judging full article`);
  }
  if (words < MIN_JUDGE_WORDS) warnings.push(`${rel}: body under ${MIN_JUDGE_WORDS} words — judge skipped, heuristic only`);

  // Cap API calls, not files examined. The old cap was applied to the file list
  // before this check, so ten mechanical edits could consume the whole budget
  // and the article that actually changed prose was never judged.
  if (judged >= MAX_FILES) {
    overCap.push(rel);
    continue;
  }
  judged++;
  if (judged > 1) await sleep(6000);
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
if (overCap.length) {
  console.warn(
    `⚠️  judge budget reached (${MAX_FILES}); ${overCap.length} article(s) with changed prose were not judged: ` +
      `${overCap.slice(0, 5).join(", ")}${overCap.length > 5 ? " …" : ""} — re-run with SKIP_SLOP_GATE unset after a smaller commit, or raise MAX_FILES`,
  );
}
if (failures.length) {
  console.error("\n❌ SLOP-GATE FAILED:");
  failures.forEach((x) => console.error("   - " + x));
  console.error("Fix flagged voice (concrete details over generic padding, cut tell phrases) and re-run.");
  process.exit(1);
}
console.log(`\n✅ Slop-Gate passed: ${files.length} article(s) checked, ${judged} judged, ${skipped} mechanical.`);
