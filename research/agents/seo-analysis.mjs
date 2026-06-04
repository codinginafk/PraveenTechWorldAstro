import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log, ensureDir } from "./lib/shared.mjs";
import { llmScoreTopic } from "./lib/seo-scorer.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESEARCH_DIR = path.resolve(__dirname, "../research");

export async function runSeoAnalysis(topics, existingTitles = []) {
  log("[SEO Analysis] Starting...");
  ensureDir(path.join(RESEARCH_DIR, "competitive"));

  const results = [];
  for (const topic of topics.slice(0, 10)) {
    log(`  Scoring: ${topic.title?.slice(0, 60)}...`);
    const score = await llmScoreTopic(topic, existingTitles);
    results.push({ ...score, rawTopic: topic });
  }

  results.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filePath = path.join(RESEARCH_DIR, "competitive", `seo-${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2), "utf-8");

  log(`[SEO Analysis] ${results.length} topics scored, saved to ${path.relative(RESEARCH_DIR, filePath)}`);
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
