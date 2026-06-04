import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log, ensureDir } from "./lib/shared.mjs";
import { fetchAllSources } from "./lib/sources.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESEARCH_DIR = path.resolve(__dirname, "../research");

export async function runResearch(keywords) {
  log("[Research Agent] Starting...");
  ensureDir(path.join(RESEARCH_DIR, "topics"));

  const articles = await fetchAllSources(keywords);

  if (articles.length < 5) {
    log("[Research Agent] Few topics found. Generating fallback topics via LLM...");
    try {
      const { callLLM } = await import("./lib/shared.mjs");
      const prompt = `Generate 10 article topic ideas for a tech help website (PraveenTechWorld). Topics must be practical, question-answering, and fit these pillars: ai-tools, privacy, security, productivity, windows-fixes, android-fixes, career-growth, automation, free-software. Return as JSON array: [{ "title": "...", "source": "LLM Generated", "snippet": "...", "relevanceScore": 8 }]`;
      const result = await callLLM("You are a content strategist.", prompt, { temperature: 0.7, maxTokens: 1024 });
      const generated = JSON.parse(result.replace(/```json|```/g, "").trim());
      if (Array.isArray(generated)) articles.push(...generated);
    } catch (err) {
      log(`  Fallback generation failed: ${err.message}`);
    }
  }

  // Deduplicate by title similarity
  const seen = new Set();
  const unique = [];
  for (const a of articles) {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(a);
    }
  }

  // Clean HTML from titles and snippets
  for (const a of unique) {
    if (a.title) a.title = a.title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (a.snippet) a.snippet = a.snippet.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    // Remove trailing source name from title like " - EdTech Magazine" or "- Axios"
    a.title = a.title.replace(/\s*[-–|]\s*\w+(\s+\w+)*$/, "").trim();
  }

  // Score by source priority and recency
  const scored = unique.map((a) => {
    let relevanceScore = 5;
    const lower = (a.title + " " + a.snippet).toLowerCase();

    // Boost for pillar keywords
    const pillarKeywords = ["chatgpt", "ai", "privacy", "security", "password", "windows", "android",
      "productivity", "career", "resume", "automation", "free", "student", "work", "office",
      "google", "microsoft", "apple", "tracking", "data", "remove", "delete", "protect"];
    for (const kw of pillarKeywords) {
      if (lower.includes(kw)) relevanceScore += 1;
    }

    // Source authority boost
    if (a.source === "Currents") relevanceScore += 2;
    if (a.source === "Hacker News") relevanceScore += 1;
    if (a.score && a.score > 50) relevanceScore += 2;

    // Penalize very short titles (likely not useful)
    if (a.title.length < 15) relevanceScore -= 2;

    return { ...a, relevanceScore };
  });

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const top = scored.slice(0, 15);

  // Write to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filePath = path.join(RESEARCH_DIR, "topics", `${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(top, null, 2), "utf-8");

  log(`[Research Agent] ${top.length} topics saved to ${path.relative(RESEARCH_DIR, filePath)}`);
  return top;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const kw = process.argv[2] || "AI,privacy,security,productivity,Windows,Android,ChatGPT,career,automation";
  runResearch(kw).catch(console.error);
}
