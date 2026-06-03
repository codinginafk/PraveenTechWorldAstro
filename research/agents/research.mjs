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
  callLLM,
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
  const urlRegex = /^- \*\*URL:\*\* (.+)$/gm;
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

  let pageContent = "";
  if (selectedTopic.url) {
    console.log("Fetching source content...");
    try {
      const res = await fetch(selectedTopic.url, {
        headers: { "User-Agent": "PraveenTechWorld-Research/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        pageContent = await res.text();
        const titleMatch = pageContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch) {
          console.log(`  Title: ${titleMatch[1].trim()}`);
        }
        const bodyText = pageContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 6000);
        if (bodyText.length > 200) {
          console.log("  Running LLM analysis...");
          const llmResult = await callLLM(
            "You are a research analyst for PraveenTechWorld tech knowledge base.",
            'Analyze this page about "' + selectedTopic.title + '" (URL: ' + selectedTopic.url + ') and return a structured analysis with these labeled sections:\n' +
            'SUMMARY: (2-3 sentences)\n' +
            'KEY POINTS: (numbered list, 3-5 items)\n' +
            'SEO TITLE: (max 60 chars, include primary keyword)\n' +
            'SOCIAL HOOK: (max 150 chars, clickable, not the same as SEO title)\n' +
            'FAQ: (3 questions with brief answers)\n\n' +
            'Page content:\n' + bodyText,
            { temperature: 0.3, maxTokens: 2048 }
          );
          if (llmResult) {
            const sections = {};
            const parts = llmResult.split(/\n(?=\*{0,2}(?:#+\s*)?(?:SUMMARY|KEY POINTS|SEO TITLE|SOCIAL HOOK|FAQ)\s*:)/i);
            for (const part of parts) {
              const m = part.match(/^\*{0,2}(?:#+\s*)?(SUMMARY|KEY POINTS|SEO TITLE|SOCIAL HOOK|FAQ)\s*:\*{0,2}\s*\n?([\s\S]*)$/i);
              if (m) {
                sections[m[1].toUpperCase()] = m[2].trim();
              }
            }
            if (sections.SUMMARY) research.summary = sections.SUMMARY.replace(/\*+/g, "").trim();
            if (sections["KEY POINTS"]) {
              const lines = sections["KEY POINTS"].split("\n").filter((l) => l.trim());
              research.keyPoints = lines.map((l) => l.replace(/^\s*\d+[.\)]\s*\*{0,2}\s*/, "").replace(/\*{1,2}/g, "").trim()).filter(Boolean);
            }
            if (sections["SEO TITLE"]) research.seoTitle = sections["SEO TITLE"].replace(/\*+/g, "").trim();
            if (sections["SOCIAL HOOK"]) research.socialHook = sections["SOCIAL HOOK"].replace(/\*+/g, "").trim();
            if (sections.FAQ) {
               const faqLines = sections.FAQ.split("\n").filter((l) => l.trim());
               const parsed = [];
               for (const line of faqLines) {
                 const qMatch = line.match(/^\s*\d+[.\)]\s*\*{0,2}\s*(.+?)(?:\s*\(?\*{0,2}\)?)?$/);
                 if (qMatch) {
                   const qText = qMatch[1].replace(/\*+/g, "").trim();
                   if (qText && !qText.match(/^(Answer|A:)/i)) parsed.push(qText);
                 }
               }
               if (parsed.length === 0) {
                 for (const line of faqLines) {
                   const fb = line.match(/^\*{0,2}\s*Q\d*\s*[:.)]\s*\*{0,2}\s*(.+?)\s*\*{0,2}\s*$/i);
                   if (fb) { const qt = fb[1].replace(/\*+/g, "").trim(); if (qt) parsed.push(qt); }
                 }
               }
               if (parsed.length === 0) {
                 for (const line of faqLines) {
                   const qt = line.replace(/^\s*[-*]\s*/, "").replace(/\*+/g, "").trim();
                   if (qt.endsWith("?") && qt.length > 10) parsed.push(qt);
                 }
               }
               research.faqSuggestions = parsed.length ? parsed : research.faqSuggestions;
             }
          }
        } else {
          research.keyPoints.push("Page content too short for meaningful analysis");
        }
      }
    } catch (err) {
      console.log(`  Warning: Could not fetch source: ${err.message}`);
    }
  }

  if (!research.summary) {
    console.log("  Running LLM analysis (topic-only)...");
    const llmResult = await callLLM(
      "You are a research analyst for PraveenTechWorld tech knowledge base.",
      "Analyze this topic for article planning: \"" + selectedTopic.title + "\"\n" +
      "Source URL: " + (selectedTopic.url || "N/A") + "\n\n" +
      "Return a structured analysis with these labeled sections:\n" +
      "SUMMARY: (2-3 sentences about what this topic covers)\n" +
      "KEY POINTS: (numbered list, 3-5 items covering practical aspects)\n" +
      "SEO TITLE: (max 60 chars)\n" +
      "SOCIAL HOOK: (max 150 chars, not the same as SEO title)\n" +
      "FAQ: (3 questions with brief answers)",
      { temperature: 0.3, maxTokens: 2048 }
    );
    if (llmResult) {
      const sections = {};
      const parts = llmResult.split(/\n(?=\*{0,2}(?:#+\s*)?(?:SUMMARY|KEY POINTS|SEO TITLE|SOCIAL HOOK|FAQ)\s*:)/i);
      for (const part of parts) {
        const m = part.match(/^\*{0,2}(?:#+\s*)?(SUMMARY|KEY POINTS|SEO TITLE|SOCIAL HOOK|FAQ)\s*:\*{0,2}\s*\n?([\s\S]*)$/i);
        if (m) {
          sections[m[1].toUpperCase()] = m[2].trim();
        }
      }
      if (sections.SUMMARY) research.summary = sections.SUMMARY.replace(/\*+/g, "").trim();
      if (sections["KEY POINTS"]) {
        const lines = sections["KEY POINTS"].split("\n").filter((l) => l.trim());
        research.keyPoints = lines.map((l) => l.replace(/^\s*\d+[.\)]\s*\*{0,2}\s*/, "").replace(/\*{1,2}/g, "").trim()).filter(Boolean);
      }
      if (sections["SEO TITLE"]) research.seoTitle = sections["SEO TITLE"].replace(/\*+/g, "").trim();
      if (sections["SOCIAL HOOK"]) research.socialHook = sections["SOCIAL HOOK"].replace(/\*+/g, "").trim();
      if (sections.FAQ) {
        const faqLines = sections.FAQ.split("\n").filter((l) => l.trim());
        const parsed = [];
        for (const line of faqLines) {
          const qMatch = line.match(/^\s*\d+[.\)]\s*\*{0,2}\s*(.+?)(?:\s*\(?\*{0,2}\)?)?$/);
          if (qMatch) {
            const qText = qMatch[1].replace(/\*+/g, "").trim();
            if (qText && !qText.match(/^(Answer|A:)/i)) parsed.push(qText);
          }
        }
        // Fallback: look for lines starting with **Q or just bold text ending in ?
        if (parsed.length === 0) {
          for (const line of faqLines) {
            const fallbackMatch = line.match(/^\*{0,2}\s*Q\d*\s*[:.)]\s*\*{0,2}\s*(.+?)\s*\*{0,2}\s*$/i);
            if (!fallbackMatch) continue;
            const qText = fallbackMatch[1].replace(/\*+/g, "").trim();
            if (qText) parsed.push(qText);
          }
        }
        // Second fallback: list items ending in ?
        if (parsed.length === 0) {
          for (const line of faqLines) {
            const qText = line.replace(/^\s*[-*]\s*/, "").replace(/\*+/g, "").trim();
            if (qText.endsWith("?") && qText.length > 10) parsed.push(qText);
          }
        }
        research.faqSuggestions = parsed.length ? parsed : research.faqSuggestions;
      }
    }
  }

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
    (data.keyPoints.length ? data.keyPoints.map((p) => `- ${p}`).join("\n") : "- Key points pending."),
    "",
    `## Suggested FAQ`,
    data.faqSuggestions.length ? data.faqSuggestions.map((q) => `- ${q}`).join("\n") : "- FAQ pending.",
    "",
    `## Suggested Internal Links`,
    data.internalLinks.map((l) => `- ${l}`).join("\n"),
    "",
    `## Content Suggestions`,
    `- **SEO Title:** ${data.seoTitle || data.topic}`,
    `- **Social Hook:** ${data.socialHook || "Create a compelling hook based on the problem this solves."}`,
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
