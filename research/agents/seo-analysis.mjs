import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log, ensureDir, fetchJSON } from "./lib/shared.mjs";
import { llmScoreTopic } from "./lib/seo-scorer.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESEARCH_DIR = path.resolve(__dirname, "../research");

async function searchGoogleCX(query) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  if (!apiKey || !cx) return null;

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`;
    const data = await fetchJSON(url);
    if (!data || !data.items) return [];
    return data.items.map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet || "",
      source: item.displayLink,
    }));
  } catch (err) {
    log(`  [Google CX] Query error: ${err.message}`);
    return null;
  }
}

export async function runSeoAnalysis(topics, existingTitles = [], sourceArticles = []) {
  log("[SEO Analysis] Starting...");
  ensureDir(path.join(RESEARCH_DIR, "competitive"));

  const results = [];
  const batch = Array.isArray(topics) ? topics.slice(0, 10) : (topics.topics || []).slice(0, 10);

  for (const topic of batch) {
    log(`  Scoring: ${(topic.title || topic.topic?.title || "").slice(0, 60)}...`);

    const topicTitle = topic.title || topic.topic?.title || "";
    const titleForCX = topic.seoTitle || topicTitle;

    // Run 3 CX strategies to find competitor context (parallelized)
    const cxPromises = [
      searchGoogleCX(`${titleForCX} announcing OR released OR deprecated`),
      searchGoogleCX(`${titleForCX} vs OR alternative to OR problem with`),
      searchGoogleCX(`${titleForCX} how we built OR scaling OR postmortem`),
    ];
    const cxSettled = await Promise.allSettled(cxPromises);
    const changelogResults = cxSettled[0].status === "fulfilled" ? cxSettled[0].value : [];
    const painPointResults = cxSettled[1].status === "fulfilled" ? cxSettled[1].value : [];
    const deepDiveResults = cxSettled[2].status === "fulfilled" ? cxSettled[2].value : [];

    const cxResults = [
      ...(changelogResults || []),
      ...(painPointResults || []),
      ...(deepDiveResults || []),
    ].filter((r, i, arr) => arr.findIndex((x) => x.link === r.link) === i).slice(0, 10);

    // Find source articles related to this topic
    const relatedSources = (sourceArticles || []).filter((sa) => {
      const t = (topicTitle + " " + (topic.snippet || topic.topic?.snippet || "")).toLowerCase();
      const st = (sa.title + " " + sa.snippet).toLowerCase();
      const words = t.split(/\s+/).filter((w) => w.length > 4);
      return words.some((w) => st.includes(w));
    }).slice(0, 5);

    const score = await llmScoreTopic(topic, existingTitles, cxResults, relatedSources);
    results.push({ ...score, topic, cxResults, relatedSources });
  }

  results.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filePath = path.join(RESEARCH_DIR, "competitive", `seo-${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2), "utf-8");

  log(`[SEO Analysis] ${results.length} topics scored with CX context, saved to ${path.relative(RESEARCH_DIR, filePath)}`);
  return results;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const topicsDir = path.join(RESEARCH_DIR, "topics");
  if (!fs.existsSync(topicsDir)) {
    console.error("No topics directory found. Run research agent first.");
    process.exit(1);
  }
  const files = fs.readdirSync(topicsDir).filter((f) => f.endsWith(".json")).sort().reverse();
  if (files.length === 0) {
    console.error("No topic files found.");
    process.exit(1);
  }
  const latest = JSON.parse(fs.readFileSync(path.join(topicsDir, files[0]), "utf-8"));
  runSeoAnalysis(latest).catch(console.error);
}
