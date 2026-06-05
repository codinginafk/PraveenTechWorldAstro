import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { callLLM } from "./lib/shared.mjs";
import { searchImage, extractKeywords } from "./lib/imagesearch.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(__filename, "../../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");

// ---- quality rules for humanized content ----
const RULES = [
  "Write as a real person with real experience. Use first person: 'In my experience', 'Here is what worked for me', 'I found that', 'The way I like to do this is'. Sound like you have actually done this before.",
  "Never use em dashes (—) or en dashes (–). Not in titles, not anywhere. Use a regular hyphen with spaces ( - ), use a colon (:), use a comma, or write two separate sentences.",
  "Structure tutorials as numbered step-by-step instructions. Each step must be a clear, specific action: 'Step 1: Click the Start button in the bottom-left corner of your screen.'",
  "Very short paragraphs. 1-3 sentences max. Break complex instructions into individual numbered steps. No walls of text.",
  "Use exact directional language: 'the blue button on the right side of the screen', 'scroll down to the third option under Settings', 'press Ctrl + Shift + Esc on your keyboard'.",
  "No random bold text. Only bold UI labels like menu names or button text.",
  "No blockquotes unless you are quoting a real person or source.",
  "No headings like 'Why This Matters' or 'What You Will Learn'. Use natural headings that describe what the section actually covers.",
  "Start with a real hook. A specific situation, a common frustration, a surprising fact. Not a generic statement.",
  "Use contractions naturally: don't, can't, won't, it's, you'll, we've, I'm, there's.",
  "Avoid these words completely: delve, navigate, landscape, tapestry, leverage, utilize, transformative, revolutionize, game-changer, ever-evolving, a myriad of, multifaceted.",
  "Avoid these phrases: 'In today's digital world', 'In this article', 'It is important to note', 'It's worth noting', 'In conclusion', 'To summarize'.",
  "Use specific numbers and real examples. Not 'many people' but '73% of office workers'.",
  "The FAQ should be 3-5 real questions with genuine answers, not filler. Put them at the end using **Q:** and **A:** format naturally.",
  "Target length: 1200-2000 words but do not pad. Every paragraph must teach something useful.",
  "Read the article back to yourself. If any sentence sounds like it was written by AI, rewrite it in your own voice with specific experience.",
];

function slug(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

export async function generateArticle({ title, description, category, tags, seoTitle, socialHook, publishDate, depthInstruction }) {
  console.log(`\n=== Generating: ${title} ===\n`);

  const sysPrompt = `You are a tech expert writing from real experience. You write for PraveenTechWorld, a site that helps students and office workers solve practical tech problems. Every article should sound like you are explaining to a friend who asked for help — specific, patient, and step-by-step.

Follow these rules exactly:
${RULES.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;

  const depth = depthInstruction || "Write at least 1500 words with clear step-by-step instructions.";

  const userPrompt = `Write a complete article with this information:

TITLE: ${title}
SHORT DESCRIPTION: ${description}
CATEGORY: ${category}
SEO TITLE: ${seoTitle}
SOCIAL HOOK: ${socialHook}

Return only the article body. No frontmatter. No --- separators. Start with the first heading (##).

Include a FAQ section at the end with **Q:** and **A:** format. The article should thoroughly answer the question someone would search for. ${depth}`;

  let body = await callLLM(sysPrompt, userPrompt, { temperature: 0.7, maxTokens: 8192 });
  if (!body) {
    console.error("  Generation failed");
    return null;
  }

  // Strip any em/en dashes from body (safety net)
  body = body.replace(/\u2014/g, "-").replace(/\u2013/g, "-");

  // Find a topic-relevant image
  const s = slug(title);
  const keywords = extractKeywords(title, tags, category);
  const imgResult = await searchImage(keywords, s, title, ROOT_DIR);
  const coverImage = imgResult?.url || `https://picsum.photos/seed/${s}/1200/600`;
  const imageAlt = (imgResult?.alt || title).slice(0, 120);
  const imageCredit = imgResult?.credit || "";

  // Generate frontmatter
  const desc = extractDescription(body, description);
  const faqYaml = extractFAQ(body);

  const lines = ["---",
    `title: "${title.replace(/"/g, "'")}"`,
    `description: "${desc.replace(/"/g, "'")}"`,
    `coverImage: "${coverImage}"`,
    `imageAlt: "${imageAlt.replace(/"/g, "'")}"`,
    imageCredit ? `imageCredit: "${imageCredit.replace(/"/g, "'")}"` : null,
    `publishDate: ${publishDate}`,
    `author: praveen`,
    `category: ${category}`,
    `tags:`,
    ...tags.map(t => `  - ${/^\d+$/.test(t) || /^0x/i.test(t) ? `"${t}"` : t}`),
    `seoTitle: "${seoTitle.replace(/"/g, "'")}"`,
    `socialHook: "${socialHook.replace(/"/g, "'")}"`,
  ];
  if (faqYaml) lines.push(faqYaml);
  lines.push("---", "");

  const frontmatter = lines.join("\n");
  const mdx = frontmatter + body;

  const filePath = path.join(ARTICLES_DIR, `${s}.mdx`);
  if (fs.existsSync(filePath)) {
    console.warn(`  DUPLICATE SKIPPED: ${s}.mdx already exists (slug collision). Delete manually if intentional.`);
    return null;
  }
  fs.writeFileSync(filePath, mdx, "utf-8");

  console.log(`  Saved: src/content/articles/${s}.mdx`);
  return filePath;
}

function extractDescription(body, fallback) {
  const cleaned = body
    .replace(/^## .+$/m, "")
    .replace(/\*\*/g, "")
    .replace(/\n+/g, " ")
    .replace(/\[.*?\]\(.*?\)/g, "")
    .trim();
  // truncate at sentence boundary near 150 chars
  const short = cleaned.length > 155 ? cleaned.slice(0, 152).replace(/\s\S*$/, "") : cleaned;
  const lastPeriod = short.lastIndexOf(".");
  return lastPeriod > 60 ? short.slice(0, lastPeriod + 1) : short;
}

function extractFAQ(body) {
  const lines = body.split("\n");
  const faqs = [];
  let inFaq = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("## ") && /faq/i.test(line)) { inFaq = true; continue; }
    if (!inFaq) continue;
    if (line.startsWith("## ")) break;
    const qMatch = line.match(/^\*{0,2}Q\s*[:.)]\s*\*{0,2}\s*(.+)/i);
    if (qMatch) {
      const q = qMatch[1].replace(/\*+/g, "").trim();
      const aLines = [];
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (next.match(/^\*{0,2}Q\s*[:.)]/i) || next.startsWith("## ")) break;
        if (next.match(/^\*{0,2}A\s*[:.)]/i)) {
          aLines.push(next.replace(/^\*{0,2}A\s*[:.)]\s*/i, "").replace(/\*+/g, "").trim());
        } else if (!next.match(/^\*{0,2}A\s*[:.)]/i) && aLines.length > 0) {
          aLines.push(next);
        } else if (aLines.length === 0 && next.length > 10) {
          aLines.push(next.replace(/\*+/g, "").trim());
        }
      }
      if (q && aLines.length) {
        faqs.push({ question: q, answer: aLines.join(" ").slice(0, 250) });
      }
    }
  }
  return faqs.length
    ? "faq:\n" + faqs.map(f => `  - question: "${f.question.replace(/"/g, "'")}"\n    answer: "${f.answer.replace(/"/g, "'")}"`).join("\n")
    : "";
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length >= 3) {
    // positional: title, category, publishDate, tags (comma sep)
    const title = args[0];
    const category = args[1];
    const publishDate = args[2];
    const tags = args[3] ? args[3].split(",").map(t => t.trim()) : [category];
    const seoTitle = args[4] || title;
    const socialHook = args[5] || `Learn how to ${title.toLowerCase()}. Practical advice you can use today.`;
    const description = args[6] || `A practical guide to ${title.toLowerCase()}.`;
    const result = await generateArticle({ title, description, category, tags, seoTitle, socialHook, publishDate });
    if (result) console.log(`\nDone: ${result}`);
  } else {
    // demo article
    const result = await generateArticle({
      title: "How to Use ChatGPT to Summarize Long PDFs for Free",
      description: "Stop reading long documents. Upload them to ChatGPT and get a clean summary in seconds.",
      category: "ai-tools",
      tags: ["chatgpt", "productivity-tips"],
      seoTitle: "Summarize PDFs with ChatGPT for Free",
      socialHook: "You do not have to read 50-page reports anymore. Drop them in ChatGPT. Get the summary in 10 seconds.",
      publishDate: "2026-06-05",
    });
    if (result) console.log(`\nDone: ${result}`);
  }
}
