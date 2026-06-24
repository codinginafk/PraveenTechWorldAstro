import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "../lib/shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const STATE_FILE = path.join(__dirname, "..", "state.json");

const BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")); }
  catch { return {}; }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function getApiKey() {
  return process.env.BING_API_KEY;
}

function getSiteUrl() {
  return process.env.BING_SITE_ID || "www.praveentechworld.com";
}

async function bingApiCall(method, params = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    log("[Bing Client] No BING_API_KEY in .env — skipping. Set it up at bing.com/webmasters");
    return null;
  }

  const query = new URLSearchParams({ apiKey, siteUrl: getSiteUrl(), ...params }).toString();
  const url = `${BING_API_BASE}/${method}?${query}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      log(`[Bing Client] API ${method} returned HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    log(`[Bing Client] API ${method} failed: ${err.message}`);
    return null;
  }
}

export async function getBingCrawlStats() {
  log("[Bing Client] Fetching crawl stats...");
  const data = await bingApiCall("GetDeepCrawlStatus");
  if (data) {
    log(`[Bing Client] Crawl pages crawled: ${data.PagesCrawled || "N/A"}`);
  }
  return data;
}

export async function getBingQueryTraffic(daysBack = 7) {
  log("[Bing Client] Fetching query traffic...");
  const startDate = new Date(Date.now() - daysBack * 86400000).toISOString().split("T")[0];
  const endDate = new Date().toISOString().split("T")[0];
  const data = await bingApiCall("GetQueryTrafficData", { startDate, endDate });
  return data;
}

export async function getBingUrlTraffic(daysBack = 7) {
  log("[Bing Client] Fetching URL traffic...");
  const startDate = new Date(Date.now() - daysBack * 86400000).toISOString().split("T")[0];
  const endDate = new Date().toISOString().split("T")[0];
  const data = await bingApiCall("GetUrlTrafficData", { startDate, endDate });
  return data;
}

export async function getBingBacklinks() {
  log("[Bing Client] Fetching backlink data...");
  const data = await bingApiCall("GetBacklinks", { limit: 100 });
  if (data?.Backlinks) {
    log(`[Bing Client] Found ${data.Backlinks.length} backlinks`);
  }
  return data;
}

export async function submitSitemapToBing() {
  log("[Bing Client] Submitting sitemap to Bing...");
  const feedUrl = "https://www.praveentechworld.com/sitemap-index.xml";
  const data = await bingApiCall("SubmitFeed", { feedUrl });
  if (data) {
    log(`[Bing Client] Sitemap submitted: ${JSON.stringify(data).slice(0, 100)}`);
    const state = loadState();
    state.lastBingSitemapSubmit = new Date().toISOString();
    saveState(state);
  }
  return data;
}

export async function fetchAllBingData() {
  const results = {};

  const crawlStats = await getBingCrawlStats();
  if (crawlStats) results.crawlStats = crawlStats;

  const queryTraffic = await getBingQueryTraffic();
  if (queryTraffic) results.queryTraffic = queryTraffic;

  const urlTraffic = await getBingUrlTraffic();
  if (urlTraffic) results.urlTraffic = urlTraffic;

  const backlinks = await getBingBacklinks();
  if (backlinks) results.backlinks = backlinks;

  results.fetchedAt = new Date().toISOString();
  return Object.keys(results).length > 1 ? results : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] || "all";
  const actions = {
    all: fetchAllBingData,
    crawl: getBingCrawlStats,
    queries: getBingQueryTraffic,
    urls: getBingUrlTraffic,
    backlinks: getBingBacklinks,
    submit: submitSitemapToBing,
  };
  const action = actions[cmd];
  if (action) {
    action().then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error);
  }
}
