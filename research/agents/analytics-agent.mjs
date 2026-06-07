import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "./lib/shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const STATE_FILE = path.join(__dirname, "state.json");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const ANALYTICS_FILE = path.join(__dirname, "analytics-data.json");

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")); }
  catch { return {}; }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function loadAnalytics() {
  try { return JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf-8")); }
  catch { return { articles: {}, history: [] }; }
}

function saveAnalytics(data) {
  const dir = path.dirname(ANALYTICS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function fetchGscData() {
  try {
    const { google } = await import("googleapis");
    const saPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(ROOT_DIR, "gcp-service-account.json");
    if (!fs.existsSync(saPath)) return null;

    const auth = new google.auth.GoogleAuth({
      keyFile: saPath,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    const searchconsole = google.searchconsole({ version: "v1", auth: await auth.getClient() });

    const res = await searchconsole.searchanalytics.query({
      siteUrl: "sc-domain:praveentechworld.com",
      requestBody: {
        startDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        dimensions: ["page"],
        rowLimit: 100,
      },
    });

    return res.data.rows || [];
  } catch (err) {
    log(`[Analytics Agent] GSC fetch failed: ${err.message}`);
    return null;
  }
}

function findContentGaps(articles, gscData) {
  if (!gscData || gscData.length === 0) return [];

  const articleUrls = new Set(articles.map(a => `/blog/${a.slug || a.id || a.replace(/\.mdx$/, "")}`));
  const gaps = [];

  for (const row of gscData) {
    const pageUrl = row.keys?.[0] || "";
    if (!pageUrl.includes("/blog/")) continue;
    if (articleUrls.has(pageUrl)) continue;

    gaps.push({
      url: pageUrl,
      impressions: row.impressions || 0,
      clicks: row.clicks || 0,
      ctr: row.ctr ? (row.ctr * 100).toFixed(1) + "%" : "0%",
      avgPosition: row.position ? row.position.toFixed(1) : "N/A",
    });
  }

  return gaps.sort((a, b) => b.impressions - a.impressions).slice(0, 20);
}

function findPerformingArticles(articles, gscData) {
  if (!gscData || gscData.length === 0) return { top: [], declining: [] };

  const articleMap = {};
  for (const a of articles) {
    const slug = a.slug || a.replace(/\.mdx$/, "");
    articleMap[`/blog/${slug}`] = a;
  }

  const top = [];
  const impressionsByUrl = {};

  for (const row of gscData) {
    const url = row.keys?.[0] || "";
    if (!articleMap[url]) continue;
    top.push({
      slug: url.replace("/blog/", ""),
      title: articleMap[url].title || articleMap[url],
      impressions: row.impressions || 0,
      clicks: row.clicks || 0,
      ctr: row.ctr ? (row.ctr * 100).toFixed(1) + "%" : "0%",
      avgPosition: row.position ? row.position.toFixed(1) : "N/A",
    });
    impressionsByUrl[url] = row.impressions || 0;
  }

  const sorted = top.sort((a, b) => b.clicks - a.clicks);
  return {
    top: sorted.slice(0, 10),
    zeroClicks: sorted.filter(a => a.clicks === 0).slice(0, 10),
  };
}

export async function runAnalytics() {
  log("[Analytics Agent] Starting performance analysis...");

  const articles = fs.existsSync(ARTICLES_DIR)
    ? fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"))
    : [];

  const analytics = loadAnalytics();
  analytics.lastRun = new Date().toISOString();

  const gscData = await fetchGscData();

  if (gscData) {
    analytics.gscData = gscData;
    analytics.contentGaps = findContentGaps(articles, gscData);
    analytics.performingArticles = findPerformingArticles(articles, gscData);

    log(`[Analytics Agent] GSC data fetched: ${gscData.length} rows`);
    log(`[Analytics Agent] Content gaps found: ${analytics.contentGaps.length}`);

    const top = analytics.performingArticles?.top || [];
    const zero = analytics.performingArticles?.zeroClicks || [];
    log(`[Analytics Agent] Top article: ${top[0]?.title || "N/A"} (${top[0]?.clicks || 0} clicks)`);
    log(`[Analytics Agent] Zero-click articles: ${zero.length}`);
  } else {
    log("[Analytics Agent] GSC data unavailable. Using historical data only.");
    analytics.gscData = null;
    analytics.contentGaps = [];
    analytics.performingArticles = { top: [], zeroClicks: [] };
  }

  analytics.articleCount = articles.length;
  analytics.timestamp = new Date().toISOString();

  saveAnalytics(analytics);

  const state = loadState();
  state.lastAnalyticsRun = new Date().toISOString();
  state.popularTopics = (analytics.performingArticles?.top || []).map(a => a.slug);
  state.contentGaps = (analytics.contentGaps || []).map(g => g.url);
  saveState(state);

  log(`[Analytics Agent] Analysis complete. ${articles.length} articles tracked.`);

  return {
    articleCount: articles.length,
    contentGaps: analytics.contentGaps?.length || 0,
    topArticles: analytics.performingArticles?.top?.length || 0,
    gscConnected: !!gscData,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAnalytics().catch(console.error);
}
