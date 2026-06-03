import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import {
  loadConfig,
  getReportsDir,
  generateSlug,
  formatDate,
  writeReport,
  fetchJSON,
} from "./lib/shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const _importMetaUrl = import.meta.url;

async function tryNotify(topic, filename) {
  try {
    const botUrl = new URL("../../telegram/bot.mjs", _importMetaUrl).href;
    const { notifyBriefReady } = await import(botUrl);
    await notifyBriefReady(topic, filename);
  } catch {
    // Telegram not configured—silently skip
  }
}
}

function listOpportunityReports() {
  const dir = path.join(getReportsDir(), "opportunities");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
}

function readOpportunityReport(filename) {
  const filePath = path.join(getReportsDir(), "opportunities", filename);
  return fs.readFileSync(filePath, "utf-8");
}

function extractTopics(reportText) {
  const topics = [];
  const headingRegex = /^### (.+)$/gm;
  const urlRegex = /^\*\*URL:\*\* (.+)$/gm;
  const headings = [...reportText.matchAll(headingRegex)].map((m) => m[1]);
  const urls = [...reportText.matchAll(urlRegex)].map((m) => m[1]);
  for (let i = 0; i < headings.length; i++) {
    topics.push({ title: headings[i], url: urls[i] || "" });
  }
  return topics;
}

export async function runResearch(topicSlug) {
  console.log("\n=== RESEARCH AGENT ===\n");
  const reports = listOpportunityReports();

  if (reports.length === 0) {
    console.log("No opportunity reports found. Run scout first.");
    return;
  }

  const targetReport = topicSlug
    ? reports.find((r) => r.includes(topicSlug))
    : reports[0];

  if (!targetReport) {
    console.log(`No report matching "${topicSlug}". Available:`);
    reports.forEach((r) => console.log(`  - ${r}`));
    return;
  }

  console.log(`Reading: ${targetReport}\n`);
  const reportText = readOpportunityReport(targetReport);
  const topics = extractTopics(reportText);
  const selectedTopic = topics[0];

  if (!selectedTopic) {
    console.log("No topics found in the report.");
    return;
  }

  console.log(`Researching: ${selectedTopic.title}\n`);
  console.log(`Source URL: ${selectedTopic.url}\n`);

  const research = {
    topic: selectedTopic.title,
    sourceUrl: selectedTopic.url,
    date: formatDate(new Date()),
    summary: "",
    keyPoints: [],
    faqSuggestions: [],
    internalLinks: [],
    competitorUrls: [],
  };

  if (selectedTopic.url) {
    console.log("Analyzing source content...");
    try {
      const res = await fetch(selectedTopic.url, {
        headers: { "User-Agent": "PraveenTechWorld-Research/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch) {
          research.summary = `Found article: ${titleMatch[1].trim()}`;
        }
        research.keyPoints.push("Source content fetched successfully");
      }
    } catch (err) {
      console.log(`  Warning: Could not fetch source: ${err.message}`);
    }
  }

  research.faqSuggestions = [
    `What is ${selectedTopic.title}?`,
    `How does ${selectedTopic.title} work?`,
    `Is ${selectedTopic.title} worth it?`,
    `What are the alternatives to ${selectedTopic.title}?`,
    `How to get started with ${selectedTopic.title}?`,
  ];

  research.internalLinks.push(
    "/blog",
    `/category/${selectedTopic.title.toLowerCase().includes("ai") ? "ai-tools" : "productivity"}`
  );

  const slug = generateSlug(selectedTopic.title);
  const brief = generateResearchBrief(research);
  writeReport("briefs", `${slug}.md`, brief);

  console.log("\n=== RESEARCH COMPLETE ===\n");
  console.log(`Research brief saved as: research/reports/briefs/${slug}.md`);
  await tryNotify(selectedTopic.title, `${slug}.md`);
  return research;
}

function generateResearchBrief(data) {
  const lines = [
    `# Research Brief: ${data.topic}`,
    `Date: ${data.date}`,
    `Source: ${data.sourceUrl}`,
    "",
    `## Summary`,
    data.summary || "Summary pending manual review.",
    "",
    `## Key Points`,
    data.keyPoints.map((p) => `- ${p}`).join("\n") || "- Key points pending.",
    "",
    `## Suggested FAQ`,
    data.faqSuggestions.map((q) => `- ${q}`).join("\n"),
    "",
    `## Suggested Internal Links`,
    data.internalLinks.map((l) => `- ${l}`).join("\n"),
    "",
    `## Content Suggestions`,
    `- **SEO Title:** ${data.topic}`,
    `- **Social Hook:** Create a compelling hook based on the problem this solves.`,
    `- **Target Audience:** Students, office workers, knowledge workers`,
    `- **Tone:** Practical, beginner-friendly, actionable`,
    `- **Format:** Tutorial / Guide / Comparison / Troubleshooting`,
    "",
    `## Next Steps`,
    `1. Review this research brief`,
    `2. Add your own research and insights`,
    `3. Run the Draft Agent: \`node research/agents/draft.mjs "${generateSlug(data.topic)}"\``,
    "",
  ];
  return lines.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const topicSlug = process.argv[2];
  runResearch(topicSlug).catch(console.error);
}
