import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { log } from "../lib/shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const SF_REPORTS_DIR = path.join(ROOT_DIR, "seo-reports");
const SITE_URL = "http://localhost:3000";

function parseCsv(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    if (!raw) return [];
    const lines = raw.split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim().toLowerCase());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map((v) => v.replace(/"/g, "").trim());
      const row = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
      rows.push(row);
    }
    return rows;
  } catch {
    return [];
  }
}

function map4xxFindings(rows) {
  return rows.map((r) => ({
    type: "sf_4xx",
    severity: "HIGH",
    page: r.address || r.url || "",
    message: `Broken link: HTTP ${r["status code"] || r.status || "?"} — ${r.address || r.url || "unknown"}`,
  }));
}

function mapMissingAltFindings(rows) {
  return rows.map((r) => ({
    type: "sf_missing_alt",
    severity: "HIGH",
    page: r.address || r.url || "",
    message: `Image missing alt text: ${r.address || r.url || "unknown"}`,
  }));
}

function mapMissingTitleFindings(rows) {
  return rows.map((r) => ({
    type: "sf_missing_title",
    severity: "CRITICAL",
    page: r.address || r.url || "",
    message: `Page missing <title> tag: ${r.address || r.url || "unknown"}`,
  }));
}

function mapMissingCanonicalFindings(rows) {
  return rows.map((r) => ({
    type: "sf_missing_canonical",
    severity: "MEDIUM",
    page: r.address || r.url || "",
    message: `Page missing canonical link: ${r.address || r.url || "unknown"}`,
  }));
}

export async function runScreamingFrogAudit() {
  log("[ScreamingFrog] Starting headless crawl...");

  const batPath = path.join(ROOT_DIR, "run-audit.bat");
  if (!fs.existsSync(batPath)) {
    log("[ScreamingFrog] run-audit.bat not found. Skipping.");
    return { findings: [], csvPaths: {} };
  }

  try {
    execSync(`"${batPath}"`, { cwd: ROOT_DIR, stdio: "inherit", timeout: 300000 });
  } catch (err) {
    log(`[ScreamingFrog] Crawl process error: ${err.message}`);
  }

  log("[ScreamingFrog] Parsing CSV exports...");
  const csvFiles = {
    "client_error_4xx.csv": { map: map4xxFindings },
    "missing_alt_text.csv": { map: mapMissingAltFindings },
    "page_titles_missing.csv": { map: mapMissingTitleFindings },
    "canonicals_missing.csv": { map: mapMissingCanonicalFindings },
  };

  const allFindings = [];
  const csvPaths = {};

  if (!fs.existsSync(SF_REPORTS_DIR)) {
    log("[ScreamingFrog] seo-reports directory not found. Skipping CSV parse.");
    return { findings: [], csvPaths: {} };
  }

  const files = fs.readdirSync(SF_REPORTS_DIR);
  for (const file of files) {
    const csvKey = Object.keys(csvFiles).find((k) => file.toLowerCase().includes(k.toLowerCase()));
    if (!csvKey) continue;

    const filePath = path.join(SF_REPORTS_DIR, file);
    const rows = parseCsv(filePath);
    const findings = csvFiles[csvKey].map(rows);
    allFindings.push(...findings);
    csvPaths[csvKey] = filePath;
    log(`  [ScreamingFrog] ${csvKey}: ${findings.length} issues found`);
  }

  log(`[ScreamingFrog] Crawl complete. ${allFindings.length} total findings.`);
  return { findings: allFindings, csvPaths };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runScreamingFrogAudit().catch(console.error);
}
