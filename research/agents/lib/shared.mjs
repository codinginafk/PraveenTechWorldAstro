import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(__filename, "../../../..");
const REPORTS_DIR = path.join(ROOT_DIR, "research/reports");
const SOURCES_DIR = path.join(ROOT_DIR, "research/sources");

export function loadConfig() {
  const configPath = path.join(SOURCES_DIR, "config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

export function getReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  return REPORTS_DIR;
}

export function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function formatDate(date) {
  return date.toISOString().split("T")[0];
}

export function writeReport(reportDir, filename, content) {
  const dir = path.join(getReportsDir(), reportDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`  Wrote: ${filePath}`);
  return filePath;
}

export async function fetchXML(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PraveenTechWorld-Research/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.error(`  [fetchXML error] ${url}: ${err.message}`);
    return null;
  }
}

export async function fetchJSON(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "PraveenTechWorld-Research/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`  [fetchJSON error] ${url}: ${err.message}`);
    return null;
  }
}
