#!/usr/bin/env node
/**
 * scripts/syndicator.mjs
 * ---------------------------------------------------------------------------
 * The ONLY path by which an artifact reaches Dev.to (or, later, your own
 * Astro site). No other script should call Dev.to's API directly — that's
 * what let a draft skip the FSM entirely last time.
 *
 * Hard gate: refuses to publish anything whose state in mission_control.sqlite
 * isn't READY. This is the fix for the side-door bug — one check, no exceptions.
 *
 * Also sanitizes the draft before sending, aimed directly at the root cause
 * of the leak we saw (local file paths / raw metadata strings ending up in
 * body text) rather than just hoping it doesn't happen again.
 *
 * Verified against current Forem/Dev.to API docs (developers.forem.com/api)
 * before writing this: POST /api/articles, `api-key` header, 10 requests/30s
 * rate limit on creation, 30/30s on updates. Re-check those docs yourself
 * before relying on this in production — APIs drift, this was correct as of
 * today's check, not a permanent guarantee.
 *
 * Env var required: DEVTO_API_KEY
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { db, transitionArtifact } from "./mission_control.mjs";
import { onArtifactPublished } from "./cluster_manager.mjs";

const DEVTO_API_BASE = "https://dev.to/api/articles";

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
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${slug}.svg`, svg);
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
  if (!existsSync(articlesDir)) mkdirSync(articlesDir, { recursive: true });
  
  const filePath = path.join(articlesDir, `${slug}.mdx`);
  writeFileSync(filePath, mdxContent);
  console.log(`[Astro] Wrote article to ${filePath}`);
}

// ============================================================================
// 1. THE GATE — the actual fix for the bypass bug. No exceptions.
// ============================================================================

function assertReadyToPublish(artifactId) {
  const artifact = db.prepare("SELECT * FROM artifacts WHERE id = ?").get(artifactId);
  if (!artifact) throw new Error(`No artifact with id ${artifactId}`);
  if (artifact.state !== "READY") {
    throw new Error(
      `Refusing to publish artifact ${artifactId}: state is "${artifact.state}", not READY. ` +
      `Run it through the FSM (mission_control.mjs) first. There is no override flag for this — ` +
      `if you're tempted to bypass it under deadline pressure, that's exactly the situation this check exists for.`
    );
  }
  return artifact;
}

// ============================================================================
// 2. SANITIZER — aimed at the actual root cause of the leak bug, not just
//    "hope it doesn't happen again."
// ============================================================================

const LOCAL_PATH_PATTERN = /(?<!https?:\/)(?:[A-Za-z]:[\\/]|~\/|\/(?:Users|home)\/)[^\s)"']+/g;
const SUSPECT_METADATA_LINES = /^(review|draft|status|hero image:.*)$/im;

function sanitizeForPublish(markdown, artifactId) {
  let clean = markdown;
  const warnings = [];

  const localPaths = clean.match(LOCAL_PATH_PATTERN);
  if (localPaths) {
    warnings.push(`Stripped ${localPaths.length} local file path(s): ${localPaths.join(", ")}`);
    clean = clean.replace(LOCAL_PATH_PATTERN, "(image upload pending)");
  }

  const lines = clean.split("\n");
  const filteredLines = lines.filter((line) => {
    if (SUSPECT_METADATA_LINES.test(line.trim())) {
      warnings.push(`Stripped suspected leaked metadata/status line: "${line.trim()}"`);
      return false;
    }
    return true;
  });
  clean = filteredLines.join("\n");

  // Any remaining image markdown pointing somewhere other than a real URL
  // gets flagged loudly rather than silently sent — this is what should have
  // caught the original bug before it went live.
  const imageMatches = [...clean.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  for (const [, alt, src] of imageMatches) {
    if (!/^https?:\/\//.test(src)) {
      warnings.push(`Image "${alt}" has a non-URL src ("${src}") — will render broken on Dev.to. Fix before publishing.`);
    }
  }

  if (warnings.length > 0) {
    console.warn(`[syndicator] Sanitizer warnings for artifact ${artifactId}:`);
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }
  if (warnings.some((w) => w.includes("non-URL src"))) {
    throw new Error(
      `Artifact ${artifactId} has an unresolved image reference. Fix it manually before publishing — ` +
      `this is exactly the bug that caused the last leak, refusing to repeat it.`
    );
  }

  return clean;
}

// ============================================================================
// 3. DEV.TO PUBLISH CALL
// ============================================================================

async function publishToDevTo({ title, bodyMarkdown, tags = [], published = false }) {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) throw new Error("DEVTO_API_KEY environment variable is not set.");

  const slug = slugify(title);
  const canonical_url = `https://www.praveentechworld.com/blog/${slug}`;

  const res = await fetch(DEVTO_API_BASE, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      article: { title, published, body_markdown: bodyMarkdown, tags: tags.slice(0, 4), canonical_url }, // Dev.to caps at 4 tags
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Dev.to API error ${res.status}: ${errText}`);
  }
  return res.json(); // includes id, url, etc.
}

async function updateDevToArticle(articleId, { title, bodyMarkdown, tags }) {
  const apiKey = process.env.DEVTO_API_KEY;
  const slug = slugify(title);
  const canonical_url = `https://www.praveentechworld.com/blog/${slug}`;

  const res = await fetch(`${DEVTO_API_BASE}/${articleId}`, {
    method: "PUT",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ article: { title, body_markdown: bodyMarkdown, tags: tags?.slice(0, 4), published: false, canonical_url } }),
  });
  if (!res.ok) throw new Error(`Dev.to update error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function generateSocialPosts(artifactId, title, url, draftMarkdown) {
  const system = `You are a Growth Hacker. You don't write summaries; you write psychological hooks based on the latest July 2026 algorithm updates:
- LinkedIn (Interest Graph & Dwell Time Engine):
  1. DO NOT include any links in the post body (LinkedIn heavily penalizes external links in posts). Write "Link to the full interactive guide is in the first comment below."
  2. Dwell Time Hook: Start with a contrarian operational truth. Write the first 3 lines as single, short sentences with double line breaks to maximize the "See more" click rate.
  3. Actionable 3-step framework explaining what went wrong and how to fix it.
  4. End by asking a highly specific technical question to farm comments.
  5. Maximum 1 emoji.
- X (High-Velocity Threads):
  - Tweet 1: Pure hook + concrete outcome/metric. NO links.
  - Tweet 2: Key tools and files used.
  - Tweet 3: The exact roadblock you hit and how you bypassed it.
  - Tweet 4: Link to the article (external links are only allowed in the final tweet).
- Facebook (Community Engagement):
  - Share the key learning, ask a specific question, and write "Link in the comments."`;

  const userPrompt = `Generate a LinkedIn post and an X thread for the following article:
Title: ${title}
URL: ${url}

Draft content:
${draftMarkdown.slice(0, 4000)}`;

  try {
    console.log(`[Social] Generating social hooks for article ${artifactId}...`);
    const { callLLM } = await import("./mission_control.mjs");
    const result = await callLLM(artifactId, "POLICY_ENGINE", { 
      systemPrompt: system, 
      userPrompt, 
      maxTokens: 1500 
    });

    const dir = "./social_posts";
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    
    const filePath = path.join(dir, `spoke_${artifactId}.md`);
    writeFileSync(filePath, result);
    console.log(`[Social] Wrote social media hooks to ${filePath}`);
    console.log("\n=== GENERATED SOCIAL MEDIA POSTS ===\n");
    console.log(result);
    console.log("\n====================================\n");
  } catch (err) {
    console.error(`[Social] Hook generation failed: ${err.message}`);
  }
}

// ============================================================================
// 4. THE ONLY PUBLIC ENTRY POINT
// ============================================================================

async function syndicate(artifactId, { title, tags = [] } = {}) {
  const artifact = assertReadyToPublish(artifactId); // <-- the actual fix, first thing that runs

  const activeTitle = title || artifact.topic;
  const rawMarkdown = readFileSync(artifact.draft_path, "utf8");
  const cleanMarkdown = sanitizeForPublish(rawMarkdown, artifactId);

  let result;
  if (artifact.devto_article_id) {
    result = await updateDevToArticle(artifact.devto_article_id, { title: activeTitle, bodyMarkdown: cleanMarkdown, tags });
    console.log(`Updated existing Dev.to article ${artifact.devto_article_id}`);
  } else {
    result = await publishToDevTo({ title: activeTitle, bodyMarkdown: cleanMarkdown, tags });
    db.prepare("UPDATE artifacts SET devto_article_id = ?, devto_url = ? WHERE id = ?")
      .run(result.id, result.url, artifactId);
    console.log(`Published new Dev.to article: ${result.url}`);
  }

  // Deploy to local Astro site content
  try {
    writeToAstro(activeTitle, cleanMarkdown, tags);
  } catch (err) {
    console.error(`[Astro] Local deploy failed: ${err.message}`);
  }

  // Auto-generate social media posts
  await generateSocialPosts(artifactId, activeTitle, result.url || artifact.devto_url || "https://dev.to", cleanMarkdown);

  transitionArtifact(artifactId, "PUBLISHED", "Syndicated to Dev.to and Astro site via syndicator.mjs");
  
  try {
    const { onArtifactPublished } = await import('./cluster_manager.mjs').catch(() => ({}));
    if (onArtifactPublished) await onArtifactPublished(artifactId);
  } catch(e) {}

  return result;
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , cmd, artifactId, titleOrTags, tagsArg] = process.argv;
  if (cmd === "publish" && artifactId) {
    // If the 4th argument is tags (contains commas or no quotes and title is skipped)
    // For safety, let's look if tagsArg is provided. If not, titleOrTags could be tags or title.
    // Let's parse cleanly:
    let finalTitle = undefined;
    let finalTags = [];
    
    if (tagsArg) {
      finalTitle = titleOrTags;
      finalTags = tagsArg.split(",");
    } else if (titleOrTags) {
      if (titleOrTags.includes(",")) {
        finalTags = titleOrTags.split(",");
      } else {
        finalTitle = titleOrTags;
      }
    }
    
    syndicate(artifactId, { title: finalTitle, tags: finalTags })
      .then(() => process.exit(0))
      .catch((err) => {
        console.error("Syndication failed:", err.message);
        process.exit(1);
      });
  } else {
    console.log("Usage: node scripts/syndicator.mjs publish <artifactId> [\"<title>\"] [tag1,tag2,tag3]");
  }
}

export { syndicate, assertReadyToPublish, sanitizeForPublish };
