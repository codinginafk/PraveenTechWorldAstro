import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log, ensureDir } from "./lib/shared.mjs";
import { fetchAllSources } from "./lib/sources.mjs";
import { clusterHeadlines } from "./lib/topic-clustering.mjs";
import { identifyGapsInCluster } from "./lib/cluster-gaps.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESEARCH_DIR = path.resolve(__dirname, "../research");
const ARTICLES_DIR = path.resolve(__dirname, "../../src/content/articles");

// Month 1 Sprint: Website Setup & Indexing (primary) + Windows (secondary)
const SPRINT_CLUSTERS = {
  primary: {
    id: "website-setup",
    keywords: [
      "Google Search Console", "Google Analytics", "Bing Webmaster Tools", "IndexNow",
      "sitemap.xml", "robots.txt", "website indexing", "website verification",
      "website tracking", "site not indexed", "search console error",
      "analytics not tracking", "sitemap error", "search console verification",
      "GA4 not working", "google analytics setup", "track website traffic",
    ],
    hubSlug: "website-setup",
  },
  secondary: {
    id: "windows-fixes",
    keywords: [
      "Windows reinstall", "Windows reset", "clean install Windows",
      "Windows recovery", "safe mode", "startup repair", "system restore",
      "reset this PC", "Windows 11 clean install", "Windows reinstall without losing data",
    ],
    hubSlug: "windows-troubleshooting",
  },
};

const EXCLUDED = [
  "android", "iphone", "samsung", "resume", "career", "fashion", "health",
  "crypto", "nft", "playstation", "xbox", "tiktok", "instagram",
  "ai news", "ai drama", "product launch", "apple", "mac", "linux",
];

function cleanText(text) {
  if (!text) return "";
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function isExcluded(title, snippet) {
  const c = ((title || "") + " " + (snippet || "")).toLowerCase();
  return EXCLUDED.some(t => c.includes(t));
}

function countClusterArticles(clusterId) {
  if (!fs.existsSync(ARTICLES_DIR)) return 0;
  let count = 0;
  for (const f of fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"))) {
    try {
      const content = fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8");
      if (content.includes(`pillarId: ${clusterId}`) || content.includes(`category: ${clusterId}`)) count++;
    } catch {}
  }
  return count;
}

export async function runResearch(keywordsOverride) {
  log("[Research Agent] Sprint-focused research...");
  ensureDir(path.join(RESEARCH_DIR, "topics"));

  // Determine which cluster to research based on sprint gaps
  const primaryCount = countClusterArticles(SPRINT_CLUSTERS.primary.id);
  const secondaryCount = countClusterArticles(SPRINT_CLUSTERS.secondary.id);
  const clusterToResearch = primaryCount < 35 ? SPRINT_CLUSTERS.primary : SPRINT_CLUSTERS.secondary;

  log(`  Primary cluster (${SPRINT_CLUSTERS.primary.id}): ${primaryCount}/35 articles`);
  log(`  Secondary cluster (${SPRINT_CLUSTERS.secondary.id}): ${secondaryCount}/10 articles`);
  log(`  Researching: ${clusterToResearch.id}`);

  const useKeywords = keywordsOverride || clusterToResearch.keywords;
  let articles = await fetchAllSources(useKeywords);
  articles = articles.filter(a => !isExcluded(a.title, a.snippet));

  if (articles.length < 5) {
    log(`  Few results (${articles.length}). Generating fallback topics...`);
    try {
      const { callLLM } = await import("./lib/shared.mjs");
      const prompt = `Generate 10 specific problem-based article titles for a "${clusterToResearch.id}" knowledge base.
Examples of good titles:
- "Google Search Console Verification Failed? 7 Fixes"
- "How To Fix Sitemap Errors in Google Search Console"
- "GA4 Not Tracking Visitors? 12 Troubleshooting Steps"

Return JSON array: [{ "title": "...", "snippet": "..." }]`;
      const result = await callLLM("You are a technical content strategist.", prompt, { temperature: 0.7, maxTokens: 1024 });
      const generated = JSON.parse(result.replace(/```json|```/g, "").trim());
      if (Array.isArray(generated)) articles.push(...generated.map(a => ({ ...a, source: "LLM Generated" })));
    } catch (err) { log(`  Fallback failed: ${err.message}`); }
  }

  for (const a of articles) {
    if (a.title) a.title = cleanText(a.title).replace(/\s*[-–|]\s*\w+(\s+\w+)*$/, "").trim();
    if (a.snippet) a.snippet = cleanText(a.snippet);
  }

  const clusters = clusterHeadlines(articles);
  log(`  Clustered into ${clusters.length} topic groups`);

  // Identify gaps in the current cluster
  const gaps = identifyGapsInCluster(clusterToResearch.id, clusters);
  if (gaps.length > 0) {
    log(`  Gaps identified: ${gaps.map(g => g.title).join(", ")}`);
  }

  const scored = [];
  for (const cluster of clusters) {
    for (const article of cluster.articles) {
      let score = 5;
      const lower = (article.title + " " + (article.snippet || "")).toLowerCase();
      for (const kw of clusterToResearch.keywords) {
        if (lower.includes(kw.toLowerCase())) score += 1;
      }
      if (article.source === "Currents") score += 2;
      if (article.score && article.score > 50) score += 2;
      if (article.title.length < 15) score -= 2;
      scored.push({
        ...article,
        relevanceScore: score,
        clusterKey: cluster.clusterKey,
        clusterSize: cluster.clusterSize,
        sourceDiversity: cluster.sourceDiversity,
        topHeadlines: cluster.topHeadlines,
        pillarId: clusterToResearch.id,
        pillarName: clusterToResearch.id === "website-setup" ? "Website Setup & Indexing" : "Windows Troubleshooting",
        hubSlug: clusterToResearch.hubSlug,
      });
    }
  }

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const top = scored.slice(0, 20);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filePath = path.join(RESEARCH_DIR, "topics", `${timestamp}.json`);

  const output = {
    timestamp,
    keywords: useKeywords,
    cluster: clusterToResearch.id,
    clusterArticles: { primary: primaryCount, secondary: secondaryCount },
    topics: top,
    gaps,
    sourceArticles: articles.map(a => ({ title: a.title, url: a.link, snippet: a.snippet?.slice(0, 300) || "", source: a.source, date: a.date || "" })),
    clusters: clusters.map(c => ({ clusterKey: c.clusterKey, clusterSize: c.clusterSize, sourceDiversity: c.sourceDiversity, topHeadlines: c.topHeadlines?.slice(0, 5) })),
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8");
  log(`[Research Agent] ${top.length} topics saved for cluster "${clusterToResearch.id}"`);
  return output;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  async function runLoop() {
    await runResearch().catch(console.error);
    log("[Research Agent] Next research in 2 hours.");
  }
  runLoop();
  setInterval(runLoop, 2 * 60 * 60 * 1000);
}
