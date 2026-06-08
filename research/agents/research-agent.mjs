import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log, ensureDir } from "./lib/shared.mjs";
import { fetchAllSources } from "./lib/sources.mjs";
import { clusterHeadlines } from "./lib/topic-clustering.mjs";
import { updateMemory } from "./lib/topic-memory.mjs";
import { scoreCluster } from "./lib/topic-scorer.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESEARCH_DIR = path.resolve(__dirname, "../research");

function cleanText(text) {
  if (!text) return "";
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export async function runResearch(keywords) {
  log("[Research Agent] Starting...");
  ensureDir(path.join(RESEARCH_DIR, "topics"));

  const articles = await fetchAllSources(keywords);

  if (articles.length < 5) {
    log("[Research Agent] Few topics found. Generating fallback topics via LLM...");
    try {
      const { callLLM } = await import("./lib/shared.mjs");
      const prompt = `Generate 10 article topic ideas for a tech help website (PraveenTechWorld). Focus EXCLUSIVELY on Windows troubleshooting, system repair, and PC diagnostics topics. Topics must answer real questions users search when their PC breaks. Prioritize: fixing blue screens, driver issues, slow performance after reinstall, viruses surviving reset, clean install vs reset, gaming FPS after reinstall, how long reinstall takes, what problems reinstalling does NOT fix, driver persistence after reset, hardware detection after clean install. Return as JSON array: [{ "title": "...", "source": "LLM Generated", "snippet": "...", "relevanceScore": 8 }]`;
      const result = await callLLM("You are a content strategist.", prompt, { temperature: 0.7, maxTokens: 1024 });
      const generated = JSON.parse(result.replace(/```json|```/g, "").trim());
      if (Array.isArray(generated)) articles.push(...generated);
    } catch (err) {
      log(`  Fallback generation failed: ${err.message}`);
    }
  }

  // Clean titles and snippets
  for (const a of articles) {
    if (a.title) a.title = cleanText(a.title).replace(/\s*[-–|]\s*\w+(\s+\w+)*$/, "").trim();
    if (a.snippet) a.snippet = cleanText(a.snippet);
  }

  // Cluster by fuzzy title similarity
  const clusters = clusterHeadlines(articles);
  log(`  Clustered into ${clusters.length} topic groups`);

  // Update memory with velocity tracking
  const memory = updateMemory(clusters);

  // Score each cluster
  const clusterScores = clusters.map((c) => ({
    cluster: c,
    score: scoreCluster(c, memory),
  }));

  // Flatten scored topics from clusters, enrich with source context
  const scored = [];
  for (const cs of clusterScores) {
    for (const article of cs.cluster.articles) {
      let relevanceScore = 5;
      const lower = (article.title + " " + article.snippet).toLowerCase();

      const pillarKeywords = ["windows", "reinstall", "reset", "clean install", "blue screen", "driver",
        "virus", "malware", "slow", "performance", "fps", "gaming", "hardware", "boot",
        "error", "crash", "freeze", "update", "repair", "diagnostic", "system restore"];
      for (const kw of pillarKeywords) {
        if (lower.includes(kw)) relevanceScore += 1;
      }

      if (article.source === "Currents") relevanceScore += 2;
      if (article.source === "Hacker News") relevanceScore += 1;
      if (article.source === "Stack Overflow Blog") relevanceScore += 1;
      if (article.score && article.score > 50) relevanceScore += 2;
      if (article.title.length < 15) relevanceScore -= 2;

      relevanceScore += cs.score.components.velocityScore;

      scored.push({
        ...article,
        relevanceScore,
        clusterKey: cs.cluster.clusterKey,
        clusterSize: cs.cluster.clusterSize,
        sourceDiversity: cs.cluster.sourceDiversity,
        clusterScore: cs.score.total,
        topHeadlines: cs.cluster.topHeadlines,
      });
    }
  }

  scored.sort((a, b) => b.clusterScore - a.clusterScore);
  const top = scored.slice(0, 20);

  // Write enriched topics with sourceArticles for generator context
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filePath = path.join(RESEARCH_DIR, "topics", `${timestamp}.json`);

  const output = {
    timestamp,
    keywords,
    topics: top,
    sourceArticles: articles.map((a) => ({
      title: a.title,
      url: a.link,
      snippet: a.snippet?.slice(0, 300) || "",
      source: a.source,
      date: a.date || "",
    })),
    clusters: clusterScores.map((cs) => ({
      clusterKey: cs.cluster.clusterKey,
      clusterSize: cs.cluster.clusterSize,
      sourceDiversity: cs.cluster.sourceDiversity,
      score: cs.score.total,
      topHeadlines: cs.cluster.topHeadlines.slice(0, 5),
    })),
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8");

  log(`[Research Agent] ${top.length} topics across ${clusters.length} clusters saved to ${path.relative(RESEARCH_DIR, filePath)}`);
  return output;
}

// CLI — runs every 2 hours
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const kw = process.argv[2] || "AI,privacy,security,productivity,Windows,Android,ChatGPT,career,automation";

  async function runLoop() {
    log("[Research Agent] Starting 2-hour research loop...");
    await runResearch(kw).catch(console.error);
    log(`[Research Agent] Next research in 2 hours.`);
  }

  runLoop();
  setInterval(runLoop, 2 * 60 * 60 * 1000);
}
