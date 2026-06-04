import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log, callLLM, ensureDir } from "./lib/shared.mjs";
import { buildReport, writeReport, getReportPath } from "./lib/report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESEARCH_DIR = path.resolve(__dirname, "../research");
const ARTICLES_DIR = path.resolve(__dirname, "../../src/content/articles");

const MISSIONS = [
  "Every article must satisfy at least one content pillar: ai-tools, ai-workflows, productivity, windows-fixes, android-fixes, career-growth, automation, privacy, security, free-software.",
  "Articles must answer a real question a human would ask or an AI would search for.",
  "Content must be useful, actionable, and practical for students and office workers.",
  "No pillar should get more than 40% of total articles.",
  "Topics should have virality potential (shareable, surprising, or controversial).",
];

const PILLARS = ["ai-tools", "ai-workflows", "productivity", "windows-fixes", "android-fixes", "career-growth", "automation", "privacy", "security", "free-software"];

function countPillarDistribution() {
  if (!fs.existsSync(ARTICLES_DIR)) return {};
  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx"));
  const counts = {};
  for (const f of files) {
    try {
      const content = fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8");
      const match = content.match(/category:\s*(\S+)/);
      if (match) {
        const cat = match[1];
        counts[cat] = (counts[cat] || 0) + 1;
      }
    } catch { /* skip */ }
  }
  return counts;
}

function pillarIsBalanced(pillar) {
  const dist = countPillarDistribution();
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (total === 0) return true;
  const count = dist[pillar] || 0;
  return (count / total) <= 0.4;
}

export async function runBoss(scoredTopics, { articlesToday = 0, articlesTotal = 0, goalsMet = [], goalsMissed = [] } = {}) {
  log("[Boss/CEO Agent] Starting review...");
  ensureDir(path.join(RESEARCH_DIR, "approved"));

  if (!scoredTopics || scoredTopics.length === 0) {
    log("[Boss/CEO] No topics to review.");
    return [];
  }

  // Filter: only pass >= 7 overall score
  const pass = scoredTopics.filter((t) => (t.overallScore || 0) >= 7);

  if (pass.length === 0) {
    log("[Boss/CEO] No topics scored high enough. Relaxing threshold to 6.");
    // Relax to 6 if none pass
    pass.push(...scoredTopics.filter((t) => (t.overallScore || 0) >= 6));
  }

  // Pick up to 2, respecting pillar balance
  const approved = [];
  const pillarCounts = {};
  for (const topic of pass) {
    const pillar = topic.pillarFit || "unknown";
    if (!PILLARS.includes(pillar)) continue;
    if (!pillarIsBalanced(pillar)) {
      log(`  Skipping: ${topic.topic?.title?.slice(0, 50)}... (${pillar} at limit)`);
      continue;
    }
    if (approved.length >= 2) break;
    approved.push(topic);
    pillarCounts[pillar] = (pillarCounts[pillar] || 0) + 1;
  }

  log(`  Approved: ${approved.length} topics`);

  // Write approved topics
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const approvedPath = path.join(RESEARCH_DIR, "approved", `${timestamp}.json`);
  fs.writeFileSync(approvedPath, JSON.stringify(approved, null, 2), "utf-8");

  // Write report.md
  const supplyChainIssues = [];
  if (pass.length < 2) supplyChainIssues.push("Low topic quality: only ${pass.length} topics passed SEO threshold.");
  if (articlesToday === 0) supplyChainIssues.push("No articles published yet today.");

  const improvements = [];
  if (pass.length > 0 && approved.length === 0) {
    improvements.push("All passing topics hit pillar imbalance. Consider expanding into underrepresented pillars.");
  }

  const report = buildReport({
    articlesToday,
    articlesTotal,
    topicsApproved: approved.length,
    topicsRejected: pass.length - approved.length,
    supplyChainIssues,
    improvements,
    goalsMet,
    goalsMissed,
  });
  writeReport(report);

  log("[Boss/CEO] Report written.");
  return approved;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const compDir = path.join(RESEARCH_DIR, "competitive");
  if (!fs.existsSync(compDir)) {
    console.error("No competitive analysis found. Run seo-analysis first.");
    process.exit(1);
  }
  const files = fs.readdirSync(compDir).filter((f) => f.endsWith(".json")).sort().reverse();
  if (files.length === 0) {
    console.error("No SEO analysis files found.");
    process.exit(1);
  }
  const latest = JSON.parse(fs.readFileSync(path.join(compDir, files[0]), "utf-8"));
  runBoss(latest).catch(console.error);
}
