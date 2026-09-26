/**
 * gsc-stale-state-check.mjs — weekly "is Google actually looking at these URLs" check.
 *
 * Why this exists: the GSC Page Indexing report shows an issue's start date, not the
 * date Googlebot last fetched the URL. A bucket can read "Redirect error since 09-24"
 * while the underlying fetch is from 06-19 — i.e. the error is stale state, not a live
 * defect. This script reads URL Inspection (stored state) and separates the two:
 *
 *   STALE      error state + lastCrawlTime older than --days (default 14)  -> ask Google to recrawl
 *   LIVE       error state + recent lastCrawlTime                          -> real defect, fix the site
 *   REGRESSION verdict was PASS last run, error now                        -> real defect
 *   CLEAN      PASS / submitted and indexed                                -> nothing to do
 *   UNKNOWN    "URL is unknown to Google" / inspect failed                 -> informational
 *
 * Exit codes: 0 clean, 1 STALE or REGRESSION (action required), 2 infra failure.
 * Flags: --all (sweep every sitemap URL), --add <url> [--group <name>],
 *        --days <n>, --report-only (never exit 1), --json
 *
 * Usage: node src/scripts/gsc-stale-state-check.mjs [--all] [--days 14] [--add /blog/x]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WATCHLIST = path.join(ROOT, "research/agents/gsc-watchlist.json");
const STATE = path.join(ROOT, "research/agents/gsc-stale-state.json");
const REPORT_DIR = path.join(ROOT, "research/reports");
const SITE = "https://www.praveentechworld.com";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : dflt;
};

const STALE_DAYS = parseInt(opt("--days", "0"), 10) || null;
const mode = { all: flag("--all"), reportOnly: flag("--report-only"), json: flag("--json") };

const wl = JSON.parse(fs.readFileSync(WATCHLIST, "utf8"));
const staleDays = STALE_DAYS || wl.staleAfterDays || 14;

// --add: append a URL to the watchlist and exit
if (flag("--add")) {
  const u = argv[argv.indexOf("--add") + 1];
  if (!u) { console.error("--add requires a URL"); process.exit(2); }
  const url = u.startsWith("http") ? u : u.startsWith("/") ? u : "/" + u;
  if (wl.urls.some((x) => (x.url.startsWith("http") ? x.url : SITE + x.url) === (url.startsWith("http") ? url : SITE + url))) {
    console.log("already on watchlist: " + url);
    process.exit(0);
  }
  wl.urls.push({ url, group: opt("--group", "manual"), note: "added " + new Date().toISOString().slice(0, 10) });
  fs.writeFileSync(WATCHLIST, JSON.stringify(wl, null, 2) + "\n");
  console.log("added to watchlist: " + url);
  process.exit(0);
}

const { inspectUrlDetailed } = await import("../../research/agents/seo-agent/gsc-client.mjs");

// --all: expand to every sitemap URL
let targets = wl.urls;
if (mode.all) {
  const sm = await (await fetch(SITE + "/sitemap-0.xml")).text();
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const seeded = new Set(targets.map((t) => (t.url.startsWith("http") ? t.url : SITE + t.url)));
  targets = [
    ...targets,
    ...locs.filter((l) => !seeded.has(l)).map((url) => ({ url, group: "sitemap", note: "" })),
  ];
  console.log(`Sweep mode: ${locs.length} sitemap URLs + ${seeded.size} seeded = ${targets.length}`);
}

const prev = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < targets.length; i++) {
  const t = targets[i];
  const r = await inspectUrlDetailed(t.url);
  const norm = r.url || t.url;
  if (r.error === "no_service_account") {
    console.error("No service account key. Set GOOGLE_SERVICE_ACCOUNT_PATH or place gcp-service-account.json at repo root.");
    process.exit(2);
  }
  if (r.error) {
    results.push({ ...t, url: norm, status: "ERROR", detail: r.error });
    continue;
  }

  const errState = /error|not found|soft 404|blocked/i.test(r.coverageState) && !/redirected/i.test(r.coverageState);
  const crawlAge = r.lastCrawlTime ? (Date.now() - new Date(r.lastCrawlTime).getTime()) / 86400000 : null;
  const wasPass = prev[norm]?.verdict === "PASS";
  // a fetch that predates siteFixedAt describes a site that no longer exists
  const predatesFix = wl.siteFixedAt && r.lastCrawlTime && new Date(r.lastCrawlTime) < new Date(wl.siteFixedAt);

  let status, action;
  if (r.verdict === "PASS" && /indexed/i.test(r.coverageState)) {
    status = "CLEAN"; action = "";
    if (wasPass === false) action = "recovered";
  } else if (errState && predatesFix) {
    status = "STALE"; action = `recrawl request + Validate fix (fetch ${r.lastCrawlTime.slice(0, 10)} predates the ${wl.siteFixedAt.slice(0, 10)} loop fix)`;
  } else if (errState && crawlAge !== null && crawlAge > staleDays) {
    status = "STALE"; action = `recrawl request + Validate fix (Google last fetched ${r.lastCrawlTime.slice(0, 10)}, ${Math.round(crawlAge)}d ago)`;
  } else if (errState && crawlAge !== null) {
    status = "LIVE"; action = `fix the site (Google fetched ${r.lastCrawlTime.slice(0, 10)} and still errors)`;
  } else if (wasPass === true && errState) {
    status = "REGRESSION"; action = "regressed from PASS - investigate deploy";
  } else if (/unknown to google/i.test(r.coverageState)) {
    status = "UNKNOWN"; action = "never indexed / dropped - link + request indexing if it should rank";
  } else {
    status = "CHECK"; action = `review: ${r.coverageState}`;
  }

  results.push({ ...t, url: norm, status, action, verdict: r.verdict, coverageState: r.coverageState, lastCrawlTime: r.lastCrawlTime, crawlAge: crawlAge === null ? null : Math.round(crawlAge), canonical: r.googleCanonical, referring: r.referringUrls.length });
  if (i < targets.length - 1) await sleep(250);
}

// persist state for local regression detection across runs
const next = {};
for (const r of results) if (r.verdict) next[r.url] = { verdict: r.verdict, coverageState: r.coverageState, checkedAt: new Date().toISOString() };
fs.writeFileSync(STATE, JSON.stringify(next, null, 2) + "\n");

const byStatus = (s) => results.filter((r) => r.status === s);
const stale = byStatus("STALE"), live = byStatus("LIVE"), reg = byStatus("REGRESSION"), clean = byStatus("CLEAN"), unknown = byStatus("UNKNOWN"), errs = byStatus("ERROR");

const date = new Date().toISOString().slice(0, 10);
const md = [
  `# GSC Stale-State Check — ${date}`,
  ``,
  `Checked **${results.length}** URLs against property \`${wl.property}\` (stale threshold: ${staleDays} days).`,
  ``,
  `| Status | Count | Meaning |`,
  `|---|---|---|`,
  `| STALE | ${stale.length} | Error state, but Google last fetched >${staleDays}d ago — stale report entry, needs recrawl |`,
  `| LIVE | ${live.length} | Google fetched recently AND still errors — real defect |`,
  `| REGRESSION | ${reg.length} | Was PASS last run, now errors |`,
  `| CLEAN | ${clean.length} | Submitted and indexed |`,
  `| UNKNOWN | ${unknown.length} | Unknown to Google |`,
  `| ERROR | ${errs.length} | Inspection call failed |`,
  ``,
];
for (const [label, group] of [["STALE — request recrawl", stale], ["LIVE — fix the site", live], ["REGRESSION", reg], ["ERROR", errs], ["CHECK — informational", byStatus("CHECK")], ["UNKNOWN — never indexed", unknown]]) {
  if (!group.length) continue;
  md.push(`## ${label}`, ``, `| URL | Coverage | Last crawl | Age | Action |`, `|---|---|---|---|---|`);
  for (const r of group) md.push(`| ${r.url.replace(SITE, "")} | ${r.coverageState || r.detail} | ${r.lastCrawlTime || "—"} | ${r.crawlAge ?? "—"}d | ${r.action || ""} |`);
  md.push(``);
}
const report = md.join("\n");
fs.mkdirSync(REPORT_DIR, { recursive: true });
const reportPath = path.join(REPORT_DIR, `gsc-stale-${date}.md`);
fs.writeFileSync(reportPath, report);
fs.writeFileSync(path.join(REPORT_DIR, "gsc-stale-latest.md"), report);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");

if (mode.json) console.log(JSON.stringify(results, null, 2));
else {
  console.log(report.split("\n").slice(0, 12).join("\n"));
  console.log(`\nreport: ${path.relative(ROOT, reportPath)}`);
}

const action = stale.length + live.length + reg.length;
if (action > 0) {
  console.error(`\nACTION REQUIRED: ${stale.length} stale, ${live.length} live-error, ${reg.length} regression.`);
  if (!mode.reportOnly) process.exit(1);
}
if (errs.length) process.exit(2);
console.log(`\nOK: ${clean.length} clean, ${unknown.length} unknown, no live defects.`);
