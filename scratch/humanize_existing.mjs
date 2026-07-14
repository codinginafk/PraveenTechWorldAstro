import fs from "fs";
import path from "path";
import { db, callLLM, transitionArtifact } from "../scripts/mission_control.mjs";
import { sanitizeForPublish } from "../scripts/syndicator.mjs";

const keepIds = new Set([4131288, 4131280, 4103593]);

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function generateSVGBanner(title, slug) {
  const words = title.split(" ");
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + word).length > 25) {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  const textYStart = 315 - (lines.length - 1) * 35;
  const textElements = lines.map((line, idx) => {
    return `<text x="600" y="${textYStart + idx * 70}" fill="#ffffff" font-size="52" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" text-anchor="middle">${line}</text>`;
  }).join("\n");

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b0764;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#grad)" />
  <path d="M 0 100 L 1200 100 M 0 200 L 1200 200 M 0 300 L 1200 300 M 0 400 L 1200 400 M 0 500 L 1200 500 M 0 600 L 1200 600" stroke="#334155" stroke-width="1" opacity="0.3" />
  <path d="M 200 0 L 200 630 M 400 0 L 400 630 M 600 0 L 600 630 M 800 0 L 800 630 M 1000 0 L 1000 630" stroke="#334155" stroke-width="1" opacity="0.3" />
  <circle cx="150" cy="150" r="100" fill="#6366f1" opacity="0.1" filter="blur(50px)" />
  <circle cx="1050" cy="480" r="150" fill="#d946ef" opacity="0.1" filter="blur(60px)" />
  ${textElements}
  <text x="600" y="570" fill="#a78bfa" font-size="24" font-family="system-ui, -apple-system, sans-serif" font-weight="600" text-anchor="middle" letter-spacing="4">PRAVEENTECHWORLD.COM</text>
</svg>`;

  const dir = "./public/images/generated";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/${slug}.svg`, svg);
  return `/images/generated/${slug}.svg`;
}

function writeToAstro(title, markdown, tags) {
  const slug = slugify(title);
  const dateStr = new Date().toISOString().split('T')[0];
  
  let cleanBody = markdown.replace(/^#\s+.+$/m, "").trim();
  
  const paragraphs = cleanBody.split('\n').map(p => p.trim()).filter(p => p.length > 50);
  const description = paragraphs[0] 
    ? paragraphs[0].replace(/[#*`_[\]()]/g, "").slice(0, 160) + "..."
    : `Technical breakdown and engineering analysis of ${title}.`;

  const coverImage = generateSVGBanner(title, slug);

  const mdxContent = `---
title: "${title}"
description: "${description}"
coverImage: "${coverImage}"
imageAlt: "${title} conceptual design"
publishDate: ${dateStr}
author: praveen
category: ai-automation
tags:
  - ${tags.length > 0 ? tags.join('\n  - ') : 'ai'}
seoTitle: "${title}"
socialHook: "${description}"
---

${cleanBody}
`;

  const articlesDir = "./src/content/articles";
  if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });
  
  const filePath = path.join(articlesDir, `${slug}.mdx`);
  fs.writeFileSync(filePath, mdxContent);
  console.log(`  [Astro] Wrote article to ${filePath}`);
}

async function runHumanizer(artifactId, draft) {
  const skillPath = path.resolve(process.cwd(), ".agents/skills/humanizer/SKILL.md");
  let instructions = "Remove signs of AI-generated writing from text to make it sound natural and human-written. Vary sentence structures, strip AI vocabulary, and use first-person narration.";
  try {
    if (fs.existsSync(skillPath)) {
      instructions = fs.readFileSync(skillPath, "utf8");
    }
  } catch (e) {
    console.warn(`[Humanizer] Could not load humanizer skill instructions: ${e.message}`);
  }

  const system = `You are a professional copyeditor. Your task is to rewrite the provided draft to remove all AI writing patterns, following these instructions:
${instructions}

Output ONLY the fully rewritten draft in clean Markdown. Do not include any introduction, conversational filler, or commentary.`;

  return await callLLM(artifactId, "POLICY_ENGINE", { 
    systemPrompt: system, 
    userPrompt: draft, 
    maxTokens: 3500 
  });
}

async function updateDevTo(articleId, title, bodyMarkdown) {
  const ROOT_DIR = path.resolve(import.meta.dirname, "..");
  const envContent = fs.readFileSync(path.join(ROOT_DIR, ".env"), "utf-8");
  let devtoKey = "";
  for (const line of envContent.split("\n")) {
    const t = line.trim();
    if (t.startsWith("DEVTO_API_KEY=")) {
      devtoKey = t.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
  if (!devtoKey) throw new Error("No DEVTO_API_KEY in .env");

  const res = await fetch(`https://dev.to/api/articles/${articleId}`, {
    method: "PUT",
    headers: {
      "api-key": devtoKey,
      "Content-Type": "application/json",
      accept: "application/vnd.forem.api-v1+json"
    },
    body: JSON.stringify({
      article: {
        title,
        body_markdown: bodyMarkdown,
        published: false
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Dev.to API error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const articles = db.prepare("SELECT * FROM artifacts").all();
  const candidates = articles.filter(a => !keepIds.has(a.devto_article_id));

  const targetId = process.argv[2] ? parseInt(process.argv[2], 10) : null;

  if (!targetId) {
    console.log("=== Humanization Candidates ===");
    candidates.forEach(c => {
      console.log(`[ID: ${c.id}] ${c.topic} (State: ${c.state}, Dev.to ID: ${c.devto_article_id})`);
    });
    console.log("\nUsage: node scratch/humanize_existing.mjs <artifactId>");
    process.exit(0);
  }

  const art = candidates.find(c => c.id === targetId);
  if (!art) {
    console.error(`Article ID ${targetId} is not a valid humanization candidate.`);
    process.exit(1);
  }

  console.log(`\nProcessing Article ${art.id}: "${art.topic}"...`);
  
  if (!fs.existsSync(art.draft_path)) {
    console.error(`Draft file not found at: ${art.draft_path}`);
    process.exit(1);
  }

  const rawDraft = fs.readFileSync(art.draft_path, "utf8");
  console.log(`[Humanizer] Running LLM humanization pass ( Nous Hermes / Llama via OmniRoute )...`);
  const humanized = await runHumanizer(art.id, rawDraft);

  if (!humanized || humanized.trim().length < 100) {
    console.error("[Humanizer] Received empty or short output. Aborting.");
    process.exit(1);
  }

  fs.writeFileSync(art.draft_path, humanized, "utf8");
  console.log(`  [Draft] Saved humanized copy to ${art.draft_path}`);

  const cleanMarkdown = sanitizeForPublish(humanized, art.id);
  writeToAstro(art.topic, cleanMarkdown, ["it", "automation", "tech"]);

  if (art.devto_article_id) {
    console.log(`  [Dev.to] Updating private draft #${art.devto_article_id}...`);
    try {
      await updateDevTo(art.devto_article_id, art.topic, cleanMarkdown);
      console.log(`  [Dev.to] Successfully updated private draft!`);
    } catch (err) {
      console.warn(`  [Dev.to] Update failed: ${err.message}`);
    }
  }

  db.prepare("UPDATE artifacts SET state = 'READY', updated_at = ? WHERE id = ?").run(new Date().toISOString(), art.id);
  console.log(`  [Database] State reset to 'READY'.`);
  console.log(`\nSuccessfully humanized Article ${art.id}!`);
}

main().catch(console.error);
