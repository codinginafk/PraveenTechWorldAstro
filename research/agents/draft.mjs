import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import {
  getReportsDir,
  generateSlug,
  formatDate,
  writeReport,
  loadConfig,
} from "./lib/shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const _importMetaUrl = import.meta.url;

async function tryNotify(topic, filename) {
  try {
    const botUrl = new URL("../../telegram/bot.mjs", _importMetaUrl).href;
    const { notifyDraftReady } = await import(botUrl);
    await notifyDraftReady(topic, filename);
  } catch {
    // Telegram not configured—silently skip
  }
}

function listResearchBriefs() {
  const dir = path.join(getReportsDir(), "briefs");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
}

function readBrief(filename) {
  const filePath = path.join(getReportsDir(), "briefs", filename);
  return fs.readFileSync(filePath, "utf-8");
}

function extractFromBrief(text, section) {
  const regex = new RegExp(`## ${section}[\\s\\S]*?(?=\\n## |$)`, "i");
  const match = regex.exec(text);
  if (!match) return "";
  return match[0].replace(`## ${section}`, "").trim();
}

export async function runDraft(briefSlug) {
  console.log("\n=== DRAFT AGENT ===\n");
  const briefs = listResearchBriefs();

  if (briefs.length === 0) {
    console.log("No research briefs found. Run research agent first.");
    return;
  }

  const targetBrief = briefSlug
    ? briefs.find((b) => b.includes(briefSlug))
    : briefs[0];

  if (!targetBrief) {
    console.log(`No brief matching "${briefSlug}". Available:`);
    briefs.forEach((b) => console.log(`  - ${b}`));
    return;
  }

  console.log(`Reading brief: ${targetBrief}\n`);
  const briefText = readBrief(targetBrief);

  const topic = briefText.split("\n")[0].replace("# Research Brief: ", "").trim();
  const summary = extractFromBrief(briefText, "Summary");
  const faqSection = extractFromBrief(briefText, "Suggested FAQ");
  const faqItems = faqSection
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace("- ", ""));

  const internalLinks = extractFromBrief(briefText, "Suggested Internal Links");
  const seoTitleLine = extractFromBrief(briefText, "Content Suggestions");
  const seoTitle = seoTitleLine.match(/SEO Title:\*\* (.+)/)?.[1] || topic;

  const today = formatDate(new Date());
  const slug = generateSlug(topic);
  const category = detectCategory(topic);

  const draft = generateDraftArticle({
    topic,
    seoTitle,
    summary,
    faqItems,
    internalLinks,
    category,
    slug,
    date: today,
  });

  writeReport("drafts", `${slug}.md`, draft);
  writeReport("drafts", `${slug}-outline.md`, generateOutline(topic, seoTitle, summary, category));

  console.log(`\n=== DRAFT COMPLETE ===\n`);
  console.log(`Article draft: research/reports/drafts/${slug}.md`);
  console.log(`Outline: research/reports/drafts/${slug}-outline.md`);
  console.log("\nNOTE: This is a machine-generated draft.");
  console.log("Human review and editing are REQUIRED before publishing.\n");
  await tryNotify(topic, `${slug}.md`);
}

function detectCategory(topic) {
  const lower = topic.toLowerCase();
  if (lower.includes("ai") || lower.includes("chatgpt") || lower.includes("claude") || lower.includes("gemini"))
    return "ai-tools";
  if (lower.includes("productivity") || lower.includes("focus") || lower.includes("time"))
    return "productivity";
  if (lower.includes("windows") || lower.includes("microsoft"))
    return "windows-fixes";
  if (lower.includes("android") || lower.includes("phone"))
    return "android-fixes";
  if (lower.includes("career") || lower.includes("job") || lower.includes("resume"))
    return "career-growth";
  if (lower.includes("security") || lower.includes("password") || lower.includes("vpn"))
    return "security";
  if (lower.includes("privacy") || lower.includes("tracking"))
    return "privacy";
  if (lower.includes("automation") || lower.includes("workflow"))
    return "automation";
  if (lower.includes("free") || lower.includes("open source"))
    return "free-software";
  return "ai-tools";
}

function generateOutline(topic, seoTitle, summary, category) {
  return [
    `# Outline: ${topic}`,
    `Category: ${category}`,
    `SEO Title: ${seoTitle}`,
    "",
    `## Structure`,
    `1. Introduction (hook the reader)`,
    `2. The Problem (why this matters)`,
    `3. The Solution (step-by-step)`,
    `4. Key Features / Benefits`,
    `5. Comparison Table (if applicable)`,
    `6. Tips and Best Practices`,
    `7. FAQ`,
    `8. Conclusion + CTA`,
    "",
    `## SEO Keywords`,
    `- ${topic}`,
    `- ${topic} guide`,
    `- how to ${topic.toLowerCase()}`,
    `- ${topic} tutorial`,
    `- best ${topic.toLowerCase()}`,
    "",
    `## Social Hook Ideas`,
    `- Emphasize time saved`,
    `- Emphasize problem solved`,
    `- Use a surprising statistic`,
    `- Challenge a common assumption`,
    "",
    `## Internal Links`,
    summary || "",
    "",
  ].join("\n");
}

function generateDraftArticle(data) {
  const frontmatter = [
    "---",
    `title: "${data.seoTitle}"`,
    `description: "${data.summary.slice(0, 150)}"`,
    `publishDate: ${data.date}`,
    `author: praveen`,
    `category: ${data.category}`,
    `tags:`,
    `  - ${data.category}`,
    `  - guide`,
    `draft: true`,
    `seoTitle: "${data.seoTitle}"`,
    "---",
    "",
  ].join("\n");

  const body = [
    `## Why This Matters`,
    ``,
    `${data.summary || `A comprehensive guide to ${data.topic}.`}`,
    ``,
    `## What You Will Learn`,
    ``,
    `- What ${data.topic} is and why it matters`,
    `- How to get started`,
    `- Practical tips and best practices`,
    `- Common mistakes to avoid`,
    ``,
    `## Step-by-Step Guide`,
    ``,
    `### 1. Understand the Basics`,
    ``,
    `Before diving in, it helps to understand what you are working with.`,
    ``,
    `### 2. Set Up Your Environment`,
    ``,
    `Make sure you have everything ready before you start.`,
    ``,
    `### 3. Follow the Process`,
    ``,
    `Work through each step carefully. Do not skip ahead.`,
    ``,
    `### 4. Test and Iterate`,
    ``,
    `Once you have the basics working, test different approaches to see what works best for your specific situation.`,
    ``,
    `## Tips for Best Results`,
    ``,
    `1. Start small and build up`,
    `2. Focus on your specific use case`,
    `3. Ask questions when stuck`,
    `4. Track what works and what does not`,
    ``,
    `## Frequently Asked Questions`,
    ``,
    data.faqItems.map((q, i) => `**${i + 1}. ${q}**\n\nAnswer pending human review.\n`).join("\n"),
    ``,
    `## Conclusion`,
    ``,
    `${data.topic} is a powerful skill to learn. Start with the basics, practice regularly, and you will improve faster than you expect.`,
    ``,
    `---`,
    ``,
    `*This is a draft article generated by the PraveenTechWorld Research Intelligence System. Human review and editing are required before publishing.*`,
    ``,
  ].join("\n");

  return frontmatter + body;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const briefSlug = process.argv[2];
  runDraft(briefSlug).catch(console.error);
}
