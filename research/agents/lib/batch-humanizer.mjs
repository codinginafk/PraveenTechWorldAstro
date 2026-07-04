import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { callAI } from "./shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const HUMANIZER_SKILL_FILE = path.join(ROOT_DIR, ".agents/skills/humanizer/SKILL.md");

const AI_VOCAB = new Set([
  "additionally", "moreover", "furthermore", "nevertheless", "consequently",
  "delve", "tapestry", "testament", "enduring", "fostering", "interplay",
  "intricate", "pivotal", "crucial", "underscore", "vibrant", "landscape",
  "garner", "showcase", "align with", "key", "valuable", "interplay", "intricacies"
]);

const CONJUNCTIVE_ADVERBS = new Set([
  "however", "therefore", "moreover", "furthermore", "nevertheless",
  "consequently", "additionally", "meanwhile", "accordingly"
]);

// Helper: separate frontmatter and body
export function splitArticle(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: "", body: content };
  const frontmatter = match[1];
  const body = content.slice(match[0].length);
  return { frontmatter, body };
}

// Helper: isolate code blocks with placeholders
export function isolateCodeBlocks(body) {
  const codeBlocks = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  
  const cleanBody = body.replace(codeBlockRegex, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length}__`;
    codeBlocks.push({ placeholder, match });
    return placeholder;
  });

  return { cleanBody, codeBlocks };
}

// Helper: restore code blocks from placeholders
export function restoreCodeBlocks(cleanBody, codeBlocks) {
  let body = cleanBody;
  for (const block of codeBlocks) {
    body = body.replace(block.placeholder, block.match);
  }
  return body;
}

// Helper: calculate statistical AI density score
export function calculateAIDensity(bodyText) {
  // Extract prose text: strip placeholders, markdown tables, and basic html tags
  const cleanProse = bodyText
    .replace(/__CODE_BLOCK_PLACEHOLDER_\d+__/g, "")
    .replace(/^\|.*\|$/gm, "") // strip markdown table lines
    .replace(/<[^>]+>/g, " ");

  const words = cleanProse.toLowerCase().match(/\b[\w'-]+\b/g) || [];
  const wordCount = words.length || 1;

  // 1. Count em dashes (ignoring table dividers and double hyphens in codes)
  const emDashes = (cleanProse.match(/—|–|\s--\s/g) || []).length;

  // 2. Count AI vocab occurrences
  let aiVocabCount = 0;
  for (const w of words) {
    if (AI_VOCAB.has(w)) aiVocabCount++;
  }

  // 3. Count conjunctive adverbs
  let conjCount = 0;
  for (const w of words) {
    if (CONJUNCTIVE_ADVERBS.has(w)) conjCount++;
  }

  // 4. Count emojis in prose
  const emojis = (cleanProse.match(/[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}]/gu) || []).length;

  // Density formula: occurrences per 1000 words
  const emDashDensity = (emDashes / wordCount) * 1000;
  const aiVocabDensity = (aiVocabCount / wordCount) * 1000;
  const conjDensity = (conjCount / wordCount) * 1000;
  const emojiDensity = (emojis / wordCount) * 1000;

  // Normalized score out of 100%
  const rawScore = (emDashDensity * 6) + (aiVocabDensity * 3) + (conjDensity * 2) + (emojiDensity * 5);
  const score = Math.min(100, Math.round(rawScore));

  return {
    score,
    wordCount,
    emDashes,
    aiVocabCount,
    conjCount,
    emojis
  };
}

// Audits all articles
function auditArticles() {
  if (!fs.existsSync(ARTICLES_DIR)) {
    console.error(`Articles directory not found: ${ARTICLES_DIR}`);
    return;
  }

  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"));
  console.log(`[Batch Humanizer] Auditing ${files.length} articles for AI density...`);

  const results = [];

  for (const file of files) {
    const fpath = path.join(ARTICLES_DIR, file);
    const content = fs.readFileSync(fpath, "utf-8");
    const { body } = splitArticle(content);
    const { cleanBody } = isolateCodeBlocks(body);
    const metrics = calculateAIDensity(cleanBody);

    results.push({
      file,
      path: fpath,
      ...metrics
    });
  }

  // Sort from most AI-like (highest score) to least
  results.sort((a, b) => b.score - a.score);

  let md = "# AI Density Audit Rankings\n\n";
  md += "| Rank | File Name | AI Score | Words | Em Dashes | AI Vocab | Conj. Adverbs |\n";
  md += "|------|-----------|----------|-------|-----------|----------|---------------|\n";
  
  results.forEach((r, idx) => {
    md += `| ${idx + 1} | ${r.file} | **${r.score}%** | ${r.wordCount} | ${r.emDashes} | ${r.aiVocabCount} | ${r.conjCount} |\n`;
  });

  const lowAi = results.filter(r => r.score < 20);
  md += `\n## Articles with < 20% AI Content (${lowAi.length} found)\n\n`;
  lowAi.forEach(r => {
    md += `- **${r.file}** (${r.score}% AI Score, ${r.wordCount} words)\n`;
  });

  console.log(md);

  const reportDir = path.join(ROOT_DIR, "research/agents/reports");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "ai-density-report.md");
  fs.writeFileSync(reportPath, md, "utf-8");
  console.log(`Saved report to ${reportPath}`);

  return results;
}

// Rewrites an article using LLM
export async function humanizeArticle(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  console.log(`[Batch Humanizer] Humanizing: ${path.basename(filePath)}`);
  const content = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = splitArticle(content);
  const { cleanBody, codeBlocks } = isolateCodeBlocks(body);

  // Load humanizer guidelines from SKILL.md if exists
  let guidelines = "";
  if (fs.existsSync(HUMANIZER_SKILL_FILE)) {
    guidelines = fs.readFileSync(HUMANIZER_SKILL_FILE, "utf-8");
  } else {
    guidelines = "Remove AI writing cliches, em-dashes (—), promotional language, and robotic vocabulary (moreover, crucial, delve, testament). Keep it natural, conversational, and direct.";
  }

  const systemPrompt = `You are a professional IT editor tasked with humanizing article prose. 
Your goal is to rewrite the text to make it sound human-written, engaging, and direct, following these guidelines:
${guidelines}

CRITICAL RULE: 
- Do NOT alter, modify, translate, or remove any code block placeholders like "__CODE_BLOCK_PLACEHOLDER_X__". They must remain EXACTLY as they are in the exact same positions.
- Do NOT alter markdown structure tags (e.g. ##, ###, bullet points) or HTML tags.
- Keep markdown links like [text](url) but you may humanize the link text (e.g. change "click here" or "this article" to a descriptive noun).
- Return ONLY the rewritten humanized body markdown. No frontmatter, no greetings, no introductory comments.`;

  const userPrompt = `Humanize this article body, preserving all placeholders:
  
${cleanBody}`;

  const humanizedProse = await callAI(systemPrompt, userPrompt, { model: "gemini", temperature: 0.3 });
  
  // Clean up any AI wrapper text if returned
  let cleanResult = humanizedProse.trim();
  if (cleanResult.startsWith("```markdown")) {
    cleanResult = cleanResult.replace(/^```markdown\r?\n|```$/g, "").trim();
  } else if (cleanResult.startsWith("```")) {
    cleanResult = cleanResult.replace(/^```\r?\n|```$/g, "").trim();
  }

  // Restore the original code blocks into placeholders
  const finalBody = restoreCodeBlocks(cleanResult, codeBlocks);

  // Reassemble article
  const finalContent = `---\n${frontmatter}\n---\n\n${finalBody}\n`;

  // Save back to file
  fs.writeFileSync(filePath, finalContent, "utf-8");
  console.log(`[Batch Humanizer] Saved humanized article: ${filePath}`);
  return finalContent;
}

// Direct execution
async function run() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "audit") {
    auditArticles();
  } else if (command === "fix") {
    const file = args[1];
    if (!file) {
      console.error("Usage: node batch-humanizer.mjs fix <file_path>");
      process.exit(1);
    }
    await humanizeArticle(file);
  } else if (command === "fix-all") {
    const limit = parseInt(args[1] || "3", 10);
    const rankings = auditArticles();
    // Filter out articles with < 20% AI score
    const targetArticles = rankings.filter(r => r.score >= 20);
    
    console.log(`\n[Batch Humanizer] Starting batch run of ${Math.min(limit, targetArticles.length)} articles (limit: ${limit})...`);
    
    let successCount = 0;
    for (let i = 0; i < Math.min(limit, targetArticles.length); i++) {
      const art = targetArticles[i];
      console.log(`\n--- Batch ${i + 1}/${limit}: ${art.file} (${art.score}% AI Score) ---`);
      try {
        await humanizeArticle(art.path);
        successCount++;
      } catch (err) {
        console.error(`Failed to humanize ${art.file}: ${err.message}`);
      }
    }
    console.log(`\n=== Batch execution complete! Successfully humanized ${successCount}/${limit} articles ===`);
  } else {
    console.log("Usage:");
    console.log("  node batch-humanizer.mjs audit");
    console.log("  node batch-humanizer.mjs fix <file_path>");
    console.log("  node batch-humanizer.mjs fix-all <limit>");
  }
}

if (process.argv[1] && (process.argv[1].endsWith("batch-humanizer.mjs") || process.argv[1].endsWith("batch-humanizer"))) {
  run().catch(err => {
    console.error("Fatal: Batch execution crashed:", err);
    process.exit(1);
  });
}
