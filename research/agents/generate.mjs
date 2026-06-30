import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { callAI } from "./lib/shared.mjs";
import { searchImage, extractKeywords } from "./lib/imagesearch.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(__filename, "../../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const HUB_DIR = path.join(ROOT_DIR, "src/content/hubs");

// Pillar → category mapping
const PILLAR_CATEGORIES = {
  "website-setup": "website-setup",
  "windows-fixes": "windows-fixes",
  "hosting-infra": "hosting-infra",
  "ai-websites": "ai-websites",
  "ai-automation": "ai-automation",
  "it-operations": "it-operations",
  "build-in-public": "build-in-public",
};

const PILLAR_HUBS = {
  "website-setup": "website-setup",
  "windows-fixes": "windows-troubleshooting",
  "hosting-infra": "web-hosting-guides",
  "ai-websites": "ai-for-websites",
  "ai-automation": "ai-automation",
  "it-operations": "it-operations",
  "build-in-public": "build-in-public",
};

function readArticleFrontmatter(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const fm = {};
    const titleMatch = content.match(/title:\s*"(.+?)"/);
    if (titleMatch) fm.title = titleMatch[1];
    const descMatch = content.match(/description:\s*"(.+?)"/);
    if (descMatch) fm.description = descMatch[1];
    const catMatch = content.match(/category:\s*(.+)/);
    if (catMatch) fm.category = catMatch[1].trim();
    const seoMatch = content.match(/seoTitle:\s*"(.+?)"/);
    if (seoMatch) fm.seoTitle = seoMatch[1];
    const tagsMatch = content.match(/tags:\s*\n((?:\s+-\s+.+\n?)*)/);
    if (tagsMatch) {
      fm.tags = [...tagsMatch[1].matchAll(/-\s+(.+?)$/gm)].map(m => m[1].trim().replace(/"/g, ""));
    }
    const slug = path.basename(filePath, ".mdx");
    return { ...fm, slug };
  } catch { return null; }
}

function findRelatedArticles(newTitle, newCategory, newTags, excludeSlug) {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx") && f !== `${excludeSlug}.mdx`);
  const articles = files.map(f => readArticleFrontmatter(path.join(ARTICLES_DIR, f))).filter(Boolean);
  const scored = articles.map(a => {
    let score = 0;
    if (a.category === newCategory) score += 10;
    const tagOverlap = (a.tags || []).filter(t => (newTags || []).some(nt => nt.toLowerCase() === t.toLowerCase())).length;
    score += tagOverlap * 3;
    return { ...a, score };
  }).filter(a => a.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

function findHubPage(pillarId) {
  const hubSlug = PILLAR_HUBS[pillarId];
  if (!hubSlug) return null;
  const hubPath = path.join(HUB_DIR, `${hubSlug}.mdx`);
  if (fs.existsSync(hubPath)) return hubSlug;
  return null;
}

function buildInterlinkingSection(relatedArticles, hubSlug) {
  const links = [];
  if (hubSlug) {
    links.push(`- [${hubSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}](/blog/${hubSlug}) — Browse all guides in this category`);
  }
  for (const a of relatedArticles) {
    links.push(`- [${a.seoTitle || a.title}](/blog/${a.slug}) — ${(a.description || "").slice(0, 100)}`);
  }
  if (!links.length) return "";
  return `\n\n## Related Guides\n\n${links.join("\n")}\n`;
}

// Problem-based title generation rules
const TITLE_PATTERNS = [
  "How to Fix [PROBLEM] on Windows 11",
  "[PROBLEM] Not Working? [N] Proven Fixes",
  "[ERROR CODE] Error on Windows [N] — How to Fix It",
  "How to [ACTION] [TOPIC] — Step by Step Guide",
  "[TOPIC] Not [WORKING/UPDATING]? Here Is the Fix",
];

// Narrative-style title patterns for new AI/IT Ops pillars
const NARRATIVE_TITLE_PATTERNS = [
  "I Built [TOOL] Using DeepSeek in [TIME] (And Where It Failed)",
  "I Am Not a [DEVELOPER/ENGINEER], But I Used AI to [ACCOMPLISH TASK]",
  "The Exact Prompt I Used to [AUTOMATE TASK] with OpenCode",
  "How I Automated [BORING TASK] So I Never Have to Do It Again",
  "I Asked AI to [BUILD SOMETHING] — Here Is What Went Wrong",
  "[PROBLEM] Was Driving Me Crazy. So I Built a Script for It.",
  "I Let DeepSeek Write My [SCRIPT/PIPELINE/TOOL]. Here Is the Code.",
  "What Happened When I Prompted AI to [BUILD TASK]",
];

const RULES = [
  "Write as a real person with real experience. Use first person: 'In my experience', 'Here is what worked for me', 'I found that', 'The way I like to do this is'.",
  "Never use em dashes (—) or en dashes (–). Not in titles, not anywhere. Use a regular hyphen with spaces ( - ), use a colon (:), use a comma, or write two separate sentences.",
  "Structure tutorials as numbered step-by-step instructions. Each step must be a clear, specific action.",
  "Very short paragraphs. 2-3 sentences max. No walls of text.",
  "Use exact directional language: 'the blue button on the right side of the screen', 'scroll down to the third option under Settings'.",
  "No random bold text. Only bold UI labels like menu names or button text.",
  "Start with a real hook. A specific situation, a common frustration, a surprising fact. Not a generic statement.",
  "Use contractions naturally: don't, can't, won't, it's, you'll, we've, I'm, there's.",
  "Avoid these words: delve, navigate, landscape, tapestry, leverage, utilize, transformative, revolutionize, game-changer, ever-evolving, a myriad of, multifaceted.",
  "Avoid these phrases: 'In today's digital world', 'In this article', 'It is important to note', 'It's worth noting', 'In conclusion', 'To summarize'.",
  "Use specific numbers and real examples. Not 'many people' but '73% of office workers'.",
  "FAQ should be 3-5 real questions with genuine answers at the end using **Q:** and **A:** format naturally.",
  "YOU MUST write 2200-2800 words. Count your paragraphs - you need at least 25. If your article is short, keep writing. Do not stop at 500 words.",
  "Include E-E-A-T signals: first-hand experience with specific examples, detailed technical accuracy, transparent honest advice.",
  "Target Grade 8-10 reading level. Clear, direct sentences.",
  "Include at least 2 contextual internal links to other PraveenTechWorld articles.",
  "Include at least 1 external citation to an authoritative source (official docs, .gov, .edu, reputable publication).",
  "Every section must answer a real question the reader would have.",
  "STRUCTURE RULE: Start every article with a 'Direct Answer' section (2-4 sentences max) that immediately answers the query.",
  "STRUCTURE RULE: After the explanation section, include two subsections: 'When This Fix Works' and 'When This Does NOT Work'.",
  "STRUCTURE RULE: Include a 'Decision Summary' section at the end: 'If X → try this. If Y → do that instead.'",
  "STRUCTURE RULE: For Windows articles, use Windows-native terminology: Control Panel, CMD, BIOS, Registry, Disk Management, Device Manager, etc.",
  "STRUCTURE RULE: Position reinstall/reset as a last resort, not the first suggestion. List 2-5 alternative fixes first.",
  "HUMANIZER: Avoid AI vocabulary — 'underscore', 'highlight', 'delve', 'landscape', 'testament', 'pivotal', 'vibrant', 'showcase', 'foster', 'enhance', 'intricate'.",
  "HUMANIZER: No present participle (-ing) phrases that add fake depth like 'ensuring that...', 'reflecting...', 'symbolizing...', 'contributing to...'",
  "HUMANIZER: No 'Not only X but Y' constructions. No 'Rule of Three' lists. No em dashes.",
  "HUMANIZER: Use 'is', 'are', 'has' instead of 'serves as', 'stands as', 'boasts', 'offers'.",
  "HUMANIZER: No vague attributions. 'Microsoft says' not 'Experts believe' or 'Industry reports'.",
  "HUMANIZER: End with a specific next step or final recommendation, not a generic positive conclusion.",
  "Never write a separate section named 'Internal Links' or 'Inter Links'. Related guides must be styled under the 'Related Guides' header only, and contextual links should be embedded naturally into sentences.",
];

// Narrative-style rules for new AI/IT Ops pillars (ai-automation, it-operations, build-in-public)
const NARRATIVE_RULES = [
  "You are an IT Operations Lead who uses AI to build things. You do NOT write code from scratch — you prompt AI to write it for you. Your value is in the architecture and business logic, not the syntax.",
  "Frame every article as a real experiment or battle log. Start with: What problem did I have? What did I ask the AI? What did it produce? Where did it fail? How did I fix it?",
  "This is NOT a tutorial. This is a documented experiment. Readers should feel like they are watching you build in real time.",
  "Include the EXACT prompt you used to get the AI to write the code. Put prompts in a code block with the label 'Prompt:' so readers can copy-paste them.",
  "Be honest about where the AI failed. Readers love seeing AI break down because it validates their own experience. Example: 'DeepSeek output a perfect-looking function, but it used a library that doesnt exist.'",
  "Use first person heavily. 'I', 'me', 'my', 'we'. The reader should feel like theyre watching over your shoulder.",
  "Show the code the AI generated, then show what you had to fix. Use before/after code blocks.",
  "Tone: Conversational, vulnerable, and direct. You are not an expert coder. You are an expert problem-solver using AI as your junior developer.",
  "Keywords to include naturally: OpenCode, DeepSeek, prompt engineering, automation, Python script, CLI tool, pipeline, workflow.",
  "DO NOT use 'expert', 'proven', 'definitive', 'ultimate' — those are old-site words. Use 'experimented', 'tried', 'discovered', 'learned', 'what worked for me'.",
  "Structure: Problem → AI attempt → Where it broke → How I fixed it → Working result → The exact prompt you can use too.",
  "Include a 'What I Learned' section at the end — this is the most clickable part for the build-in-public audience.",
  "Include a section called 'The Exact Prompt' with the raw, unedited prompt you used so readers can replicate it.",
  "Word count: 1500-2000 words is fine for narrative style. Depth matters more than length.",
  "DO NOT include generic tutorial sections like 'When This Fix Works' or 'Alternatives' — this is not a reference guide, it is a story.",
  "Do include: specific error messages, terminal output, file sizes, execution times, token counts, cost numbers. Real data builds trust.",
  "Link to the actual code/scripts on a GitHub repo if applicable. Readers will fork it.",
  "End with a question to the reader: 'What task would you automate with this approach?' — drives comments and engagement.",
  "AEO RULE: The direct answer to the query MUST appear in the first 150 words of the article. This is non-negotiable. Voice search and AI answer engines extract the first clear answer they find.",
  "AEO RULE: Write the opening answer as a standalone paragraph that could be lifted verbatim for a featured snippet or voice response. 2-4 sentences max. Start with: 'The short answer is...' or answer the question directly.",
  "GEO RULE: Include specific numbers, token counts, file sizes, execution times, and cost data throughout. LLMs preferentially cite content with measurable, verifiable data points.",
  "GEO RULE: Every H2 must be a question someone would ask (or start with 'How', 'What', 'Why', 'Can I'). LLMs extract H2-matched answers for SGE/Perplexity results.",
  "GEO RULE: Include at least 2 internal links to other PraveenTechWorld articles using contextual anchor text. LLMs use internal linking structure to assess topical authority.",
  "Never write a separate section named 'Internal Links' or 'Inter Links'. Related guides must be styled under the 'Related Guides' header only, and contextual links should be embedded naturally into sentences.",
];

function slug(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

export async function generateArticle({ title, description, category, tags, seoTitle, socialHook, pillarId, publishDate, depthInstruction, researchContext }) {
  console.log(`\n=== Generating pillar article: ${title} ===`);

  const pillarCategory = PILLAR_CATEGORIES[pillarId] || category || "windows-fixes";
  const hubSlug = PILLAR_HUBS[pillarId] || null;

  // Use narrative style for new AI/IT Ops pillars, tutorial style for legacy pillars
  const isNarrativePillar = ["ai-automation", "it-operations", "build-in-public"].includes(pillarId);
  const activeRules = isNarrativePillar ? NARRATIVE_RULES : RULES;

  const sysPrompt = isNarrativePillar
    ? `You write for PraveenTechWorld, a site where an IT Operations Lead documents how he uses AI tools to build automation scripts, data pipelines, and IT tools without being a hardcore developer.

Follow these rules exactly:
${activeRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
    : `You are an expert technical writer specializing in ${pillarCategory}. You write for PraveenTechWorld, a knowledge base that helps users build websites, grow websites, and solve Windows and IT problems. Every article should sound diagnostic, technical-but-readable, and authoritative.

Follow these rules exactly:
${activeRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;

  const depth = isNarrativePillar
    ? "Write 1500-2000 words. Focus on depth and storytelling over length. Include the exact prompt used, where AI failed, and how you fixed it."
    : "Write at least 2000 words. CRITICAL: You MUST write 2000+ words. Each section needs full paragraphs, not bullet points. Write detailed step-by-step instructions with real examples.";

  let researchSection = "";
  if (researchContext) {
    const { sourceArticles, cxResults, cluster } = researchContext;
    if (sourceArticles && sourceArticles.length > 0) {
      researchSection += "\n\nReal articles people are reading about this topic:\n" +
        sourceArticles.slice(0, 5).map(a => `- ${a.title} (${a.source}): ${a.snippet?.slice(0, 200)}`).join("\n");
    }
    if (cxResults && cxResults.length > 0) {
      researchSection += "\n\nCompetitor search results:\n" +
        cxResults.slice(0, 5).map(r => `- ${r.title} (${r.source}): ${r.snippet?.slice(0, 150)}`).join("\n");
    }
    if (cluster && cluster.topHeadlines) {
      researchSection += "\n\nTrending headlines:\n" +
        cluster.topHeadlines.slice(0, 3).map(h => `- ${h}`).join("\n");
    }
  }

  const narrativeStructure = isNarrativePillar ? `
Use this article structure:
1. The Problem (what task was driving me crazy, what prompted this)
2. The AI Attempt (what I asked DeepSeek/OpenCode to do, include the EXACT prompt in a code block)
3. Where It Broke (specific errors, unexpected outputs, hallucinations, missing libraries)
4. What I Had to Fix (the human intervention, the debugging, the architectural decisions)
5. The Working Result (final code/script, how to run it, what it outputs)
6. What I Learned (key takeaways about prompting, AI limitations, workarounds)
7. The Exact Prompt (reproducible for readers — raw, unedited)
8. FAQ (3-5 real questions about this tool/approach)
`
  : `
Use this exact article structure:
1. Direct Answer (2-4 sentences, immediately answers the query, no fluff)
2. Explanation (technical cause or mechanism)
3. When This Fix Works
4. When This Does NOT Work
5. Step-by-Step instructions (numbered)
6. Alternatives / Related Fixes (2-5, reinstall/reset as last resort)
7. Decision Summary ("If X → do this. If Y → do that.")
8. FAQ section with **Q:** and **A:** format (3-5 real questions)
`;

  const userPrompt = `Write a complete article:

TITLE: ${title}
SHORT DESCRIPTION: ${description}
CATEGORY: ${pillarCategory}
SEO TITLE: ${seoTitle}
SOCIAL HOOK: ${socialHook}
${researchSection}

Return only the article body. No frontmatter. No --- separators. Start with the first heading (##).

${narrativeStructure}

${depth}`;

  let body = await callAI(sysPrompt, userPrompt, { model: "deepseek", temperature: 0.7, maxTokens: 8192, timeout: 480000 });
  if (!body) {
    console.error("  Generation failed");
    return null;
  }

  body = body.replace(/\u2014/g, "-").replace(/\u2013/g, "-");

  const s = slug(title);
  const keywords = extractKeywords(title, tags, pillarCategory);

  const related = findRelatedArticles(title, pillarCategory, tags, s);
  const hubSlugFound = findHubPage(pillarId);
  const interlinking = buildInterlinkingSection(related, hubSlugFound);
  if (interlinking) {
    const faqIndex = body.search(/^##\s+faq/i);
    if (faqIndex !== -1) {
      body = body.slice(0, faqIndex) + interlinking + "\n\n" + body.slice(faqIndex);
    } else {
      body = body + interlinking;
    }
  }

  const imgResult = await searchImage(keywords, s, title, ROOT_DIR);
  const coverImage = imgResult?.url || `https://picsum.photos/seed/${s}/1200/600`;
  const imageAlt = (imgResult?.alt || title).slice(0, 120);
  const imageCredit = imgResult?.credit || "";

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
    `category: ${pillarCategory}`,
    `tags:`,
    ...tags.map(t => /^\d+$/.test(t) || /^0x/i.test(t) ? `  - "${t}"` : `  - ${t}`),
    `seoTitle: "${seoTitle.replace(/"/g, "'")}"`,
    `socialHook: "${socialHook.replace(/"/g, "'")}"`,
    `pillarId: ${pillarId}`,
    `status: draft`,
    `topic: "[[Topics/${s}]]"`,
    `social: "[[Social-Hooks/${s}-social]]"`,
  ];
  if (faqYaml) lines.push(faqYaml);
  lines.push("---", "");

  const frontmatter = lines.join("\n");
  const mdx = frontmatter + body;

  const DRAFTS_DIR = path.join(ROOT_DIR, "research/vault/Drafts");
  const SOCIAL_DIR = path.join(ROOT_DIR, "research/vault/Social-Hooks");
  
  if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  if (!fs.existsSync(SOCIAL_DIR)) fs.mkdirSync(SOCIAL_DIR, { recursive: true });

  const filePath = path.join(DRAFTS_DIR, `${s}.md`);
  if (fs.existsSync(filePath)) {
    console.warn(`  DUPLICATE SKIPPED: ${s}.md already exists in Obsidian vault.`);
    return null;
  }
  fs.writeFileSync(filePath, mdx, "utf-8");
  console.log(`  Saved Draft to Vault: research/vault/Drafts/${s}.md`);

  const socialFilePath = path.join(SOCIAL_DIR, `${s}-social.md`);
  const socialContent = `# 🔗 Social Media Hooks: ${title}

## 👥 LinkedIn Post
${socialHook}

## 🐦 X / Twitter Hook
${socialHook.slice(0, 280)}

---
Backlink: [[Drafts/${s}]]
`;
  fs.writeFileSync(socialFilePath, socialContent, "utf-8");
  console.log(`  Saved Social Hooks to Vault: research/vault/Social-Hooks/${s}-social.md`);

  return filePath;
}

function extractDescription(body, fallback) {
  const cleaned = body.replace(/^## .+$/m, "").replace(/\*\*/g, "").replace(/\n+/g, " ").replace(/\[.*?\]\(.*?\)/g, "").trim();
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
        } else if (aLines.length > 0) {
          aLines.push(next);
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length >= 3) {
    const [title, pillarId, publishDate, tagsStr, seoTitle, socialHook, description] = args;
    const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()) : [pillarId];
    const result = await generateArticle({ title, description: description || `A practical guide to ${title.toLowerCase()}.`, category: pillarId, tags, seoTitle: seoTitle || title, socialHook: socialHook || `Learn how to fix ${title.toLowerCase()}.`, pillarId, publishDate });
    if (result) console.log(`\nDone: ${result}`);
  } else {
    const result = await generateArticle({
      title: "Google Search Console Not Showing Data? 8 Fixes to Try",
      description: "Is your Search Console showing zero results? Here is why and how to fix it step by step.",
      category: "website-setup",
      tags: ["google-search-console", "website-setup"],
      seoTitle: "Google Search Console Not Showing Data? 8 Fixes",
      socialHook: "You set up Search Console but see no data. Here is exactly what to check, in order.",
      pillarId: "website-setup",
      publishDate: new Date().toISOString().split("T")[0],
    });
    if (result) console.log(`\nDone: ${result}`);
  }
}
