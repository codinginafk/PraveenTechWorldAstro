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

async function bingApiCall(method, params = {}, httpMethod = "GET") {
  const apiKey = getApiKey();
  if (!apiKey) {
    log("[Bing Client] No BING_API_KEY in .env — skipping. Set it up at bing.com/webmasters");
    return null;
  }

  const siteUrl = getSiteUrl();
  const query = new URLSearchParams({ apiKey }).toString();
  let url = `${BING_API_BASE}/${method}?${query}`;

  const fetchOpts = { method: httpMethod, signal: AbortSignal.timeout(15000) };
  if (httpMethod === "POST") {
    fetchOpts.headers = { "Content-Type": "application/json" };
    fetchOpts.body = JSON.stringify({ siteUrl, ...params });
  } else {
    url += `&${new URLSearchParams({ siteUrl, ...params }).toString()}`;
  }

  try {
    const res = await fetch(url, fetchOpts);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      log(`[Bing Client] API ${method} returned HTTP ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    log(`[Bing Client] API ${method} failed: ${err.message}`);
    return null;
  }
}

export async function getBingCrawlStats() {
  log("[Bing Client] Fetching crawl stats...");
  const data = await bingApiCall("GetCrawlStats");
  if (data?.d) {
    log(`[Bing Client] Crawl pages crawled: ${data.d.PagesCrawled || data.d.TotalPagesCrawled || "N/A"}`);
  }
  return data;
}

export async function getBingQueryTraffic() {
  log("[Bing Client] Fetching query traffic...");
  const data = await bingApiCall("GetQueryStats");
  if (data?.d) {
    const count = Array.isArray(data.d) ? data.d.length : "N/A";
    log(`[Bing Client] Query stats: ${count} queries`);
  }
  return data;
}

export async function getBingUrlTraffic(urlPath = "") {
  log(`[Bing Client] Fetching URL traffic for ${urlPath || "(site root)"}...`);
  const fullUrl = urlPath ? `https://www.praveentechworld.com${urlPath.startsWith("/") ? urlPath : `/${urlPath}`}` : "https://www.praveentechworld.com";
  const data = await bingApiCall("GetUrlTrafficInfo", { url: fullUrl });
  return data;
}

export async function getBingBacklinks(limit = 100) {
  log("[Bing Client] Fetching backlink data...");
  const data = await bingApiCall("GetLinkCounts", { limit });
  if (data?.d) {
    const count = Array.isArray(data.d) ? data.d.length : (data.d.Total || 0);
    log(`[Bing Client] Found ${count} backlinks`);
  }
  return data;
}

export async function submitSitemapToBing() {
  log("[Bing Client] Submitting sitemap to Bing...");
  const feedUrl = "https://www.praveentechworld.com/sitemap-index.xml";
  const data = await bingApiCall("SubmitFeed", { feedUrl }, "POST");
  if (data) {
    log(`[Bing Client] Sitemap submitted: ${JSON.stringify(data).slice(0, 100)}`);
    const state = loadState();
    state.lastBingSitemapSubmit = new Date().toISOString();
    saveState(state);
  }
  return data;
}

export async function submitUrlToBing(url) {
  log(`[Bing Client] Submitting single URL: ${url}`);
  const fullUrl = url.startsWith("http") ? url : `https://www.praveentechworld.com${url.startsWith("/") ? url : `/${url}`}`;
  const data = await bingApiCall("SubmitUrl", { url: fullUrl }, "POST");
  if (data) {
    log(`[Bing Client] URL submitted: ${JSON.stringify(data).slice(0, 100)}`);
  }
  return data;
}

export async function submitUrlBatchToBing(urls, quota = 39) {
  const normalizedUrls = urls.map(u => u.startsWith("http") ? u : `https://www.praveentechworld.com${u.startsWith("/") ? u : `/${u}`}`);
  log(`[Bing Client] Submitting ${Math.min(urls.length, quota)}/${urls.length} URLs (quota: ${quota})...`);

  // Try batch first
  const data = await bingApiCall("SubmitUrlBatch", { urlList: normalizedUrls.slice(0, quota) }, "POST");
  if (data) {
    log(`[Bing Client] Batch submitted: ${JSON.stringify(data).slice(0, 100)}`);
    const state = loadState();
    state.lastBingUrlBatchSubmit = new Date().toISOString();
    state.lastBingUrlBatchCount = Math.min(urls.length, quota);
    saveState(state);
    return data;
  }

  // Fallback: submit individually
  log(`[Bing Client] Batch failed, submitting individually (max ${quota})...`);
  let successCount = 0;
  for (const url of normalizedUrls.slice(0, quota)) {
    const r = await submitUrlToBing(url);
    if (r) successCount++;
  }
  log(`[Bing Client] Individually submitted ${successCount}/${Math.min(urls.length, quota)} URLs`);
  return null;
}

export async function fetchUrlOnBing(url) {
  log(`[Bing Client] Requesting Bing to fetch/crawl: ${url}`);
  const fullUrl = url.startsWith("http") ? url : `https://www.praveentechworld.com${url.startsWith("/") ? url : `/${url}`}`;
  const data = await bingApiCall("FetchUrl", { url: fullUrl }, "POST");
  if (data && data.d !== undefined) {
    log(`[Bing Client] Fetch result: ${JSON.stringify(data).slice(0, 100)}`);
  }
  return data;
}

export async function getBingRankAndTraffic() {
  log("[Bing Client] Fetching rank and traffic stats...");
  const data = await bingApiCall("GetRankAndTrafficStats");
  return data;
}

export async function getBingUrlInfo(urlPath) {
  log(`[Bing Client] Fetching URL info for: ${urlPath}`);
  const fullUrl = urlPath.startsWith("http") ? urlPath : `https://www.praveentechworld.com${urlPath.startsWith("/") ? urlPath : `/${urlPath}`}`;
  const data = await bingApiCall("GetUrlInfo", { url: fullUrl });
  if (data?.d) {
    log(`[Bing Client] URL status: ${data.d.CrawlStatus || data.d.IndexStatus || "unknown"}`);
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

  const rankTraffic = await getBingRankAndTraffic();
  if (rankTraffic) results.rankTraffic = rankTraffic;

  results.fetchedAt = new Date().toISOString();
  return Object.keys(results).length > 1 ? results : null;
}

export async function submitEverything() {
  log("[Bing Client] ========== SUBMITTING EVERYTHING TO BING ==========");
  const results = {};

  // 1. Submit sitemap
  log("\n--- Step 1: Submit sitemap ---");
  results.sitemap = await submitSitemapToBing();

  // 2. Get all article URLs from sitemap
  log("\n--- Step 2: Collect article URLs ---");
  let articleUrls = [];
  try {
    // sitemap-index.xml points to sub-sitemaps, so fetch sitemap-0.xml directly
    const sitemapRes = await fetch("https://www.praveentechworld.com/sitemap-0.xml", { signal: AbortSignal.timeout(10000) });
    const sitemapText = await sitemapRes.text();
    const urlMatches = sitemapText.match(/<loc>([^<]+)<\/loc>/g);
    if (urlMatches) {
      for (const loc of urlMatches) {
        const url = loc.replace(/<\/?loc>/g, "");
        if (url.includes("/blog/")) {
          articleUrls.push(url);
        }
      }
    }
    log(`[Bing Client] Found ${articleUrls.length} article URLs`);
  } catch (err) {
    log(`[Bing Client] Could not fetch sitemap: ${err.message}`);
  }

  // 3. Submit article URLs (batch first, fallback to individual)
  const DAILY_QUOTA = 39; // Bing's daily URL submission quota
  if (articleUrls.length > 0) {
    log(`\n--- Step 3: Submit ${Math.min(articleUrls.length, DAILY_QUOTA)}/${articleUrls.length} article URLs ---`);
    results.urls = await submitUrlBatchToBing(articleUrls, DAILY_QUOTA);
  } else {
    log("\n--- Step 3: No article URLs to submit ---");
  }

  // 4. Fetch top articles for immediate crawl (only 3/day)
  log("\n--- Step 4: Request immediate crawl for top 3 articles ---");
  if (articleUrls.length > 0) {
    results.fetches = [];
    for (const url of articleUrls.slice(0, 3)) {
      const r = await fetchUrlOnBing(url);
      results.fetches.push(r);
    }
  }

  // 5. Check crawl stats
  log("\n--- Step 5: Check crawl stats ---");
  results.crawlStats = await getBingCrawlStats();

  // Save to state
  try {
    const state = loadState();
    state.lastBingSubmitAll = new Date().toISOString();
    state.bingCrawlStats = {
      inIndex: results.crawlStats?.d?.slice(-1)?.[0]?.InIndex || "unknown",
      crawledPages: results.crawlStats?.d?.slice(-1)?.[0]?.CrawledPages || "unknown",
      lastUpdated: new Date().toISOString(),
    };
    saveState(state);
  } catch {}

  results.completedAt = new Date().toISOString();
  log("\n[Bing Client] ========== SUBMISSION COMPLETE ==========");
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] || "all";
  const actions = {
    all: fetchAllBingData,
    crawl: getBingCrawlStats,
    queries: getBingQueryTraffic,
    urls: getBingUrlTraffic,
    backlinks: getBingBacklinks,
    rank: getBingRankAndTraffic,
    urlinfo: () => getBingUrlInfo(process.argv[3] || "/"),
    submit: submitSitemapToBing,
    submiturl: () => submitUrlToBing(process.argv[3] || "/"),
    submitbatch: () => submitUrlBatchToBing((process.argv[3] || "").split(",").filter(Boolean)),
    fetch: () => fetchUrlOnBing(process.argv[3] || "/"),
    submitall: submitEverything,
  };
  const action = actions[cmd];
  if (action) {
    action().then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error);
  } else {
    console.error(`Unknown command: ${cmd}. Available: ${Object.keys(actions).join(", ")}`);
  }
}
