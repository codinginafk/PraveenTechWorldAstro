import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log, ensureDir } from "./lib/shared.mjs";
import { appendToReport } from "./lib/report.mjs";
import { devtoPost, hashnodePost, linkedinPost, bloggerPost, parseArticle, getNewArticles } from "./lib/syndication.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.resolve(__dirname);
const STATE_FILE = path.join(AGENTS_DIR, "state.json");
const ARTICLES_DIR = path.resolve(__dirname, "../../src/content/articles");

// Only syndicate articles in these pillar categories
const ALLOWED_CATEGORIES = ["website-setup", "windows-fixes", "hosting-infra", "ai-websites"];

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { syndicated: [], hashnodePublicationId: null };
  }
}

function saveState(state) {
  ensureDir(AGENTS_DIR);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function getArticleCategory(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const match = content.match(/category:\s*(\S+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function runSyndication() {
  log("[Syndication] Starting pillar-aware syndication...");
  const devtoKey = process.env.DEVTO_API_KEY;
  const state = loadState();
  const results = [];

  const newFiles = getNewArticles(state.syndicated || []);
  if (newFiles.length === 0) {
    log("[Syndication] No new articles to syndicate.");
    return { ok: true, syndicated: 0, total: 0 };
  }

  const file = newFiles[0];
  const filePath = path.join(ARTICLES_DIR, file);
  if (!fs.existsSync(filePath)) {
    log(`  Skipped (missing): ${file}`);
    return { ok: true, syndicated: 0, total: 0 };
  }

  // Skip articles outside the 4 pillars
  const category = getArticleCategory(filePath);
  if (!category || !ALLOWED_CATEGORIES.includes(category)) {
    log(`  SKIPPED (off-pillar category: "${category}"): ${file} — only syndicating pillar articles`);
    // Mark as syndicated so we don't retry
    state.syndicated = state.syndicated || [];
    state.syndicated.push(file);
    saveState(state);
    return { ok: true, syndicated: 0, total: 0, skipped: true };
  }

  const article = parseArticle(filePath);
  if (!article) {
    log(`  Skipped (parse failed): ${file}`);
    return { ok: true, syndicated: 0, total: 0 };
  }

  // post to Dev.to
  if (devtoKey) {
    try {
      const post = await devtoPost(article, devtoKey);
      log(`  Dev.to: "${article.title}" → ${post?.url || "OK"}`);
      results.push({ platform: "devto", file, ok: true, url: post?.url || "" });
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("429") || msg.includes("Rate limit")) {
        log(`  Dev.to rate limited, will retry next run`);
        return { ok: true, syndicated: 0, total: 0, rateLimited: true };
      }
      log(`  Dev.to FAILED: ${file} — ${err.message}`);
      results.push({ platform: "devto", file, ok: false, error: err.message });
    }
  }

  const linkedinToken = process.env.LINKEDIN_ACCESS_TOKEN;
  if (linkedinToken) {
    try {
      const post = await linkedinPost(article, linkedinToken);
      if (post) {
        log(`  LinkedIn: "${article.title}"`);
        results.push({ platform: "linkedin", file, ok: true });
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      log(`  LinkedIn FAILED: ${file} — ${err.message}`);
      results.push({ platform: "linkedin", file, ok: false, error: err.message });
    }
  }

  // Post to Twitter/X via Buffer
  const bufferToken = process.env.BUFFER_ACCESS_TOKEN || process.env.BUFFER_API_KEY;
  if (bufferToken) {
    try {
      const { postArticleToTwitter } = await import("./lib/buffer-client.mjs");
      const post = await postArticleToTwitter(article);
      if (post) {
        log(`  Buffer/Twitter: "${article.title}"`);
        results.push({ platform: "buffer", file, ok: true });
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      log(`  Buffer/Twitter FAILED: ${file} — ${err.message}`);
      results.push({ platform: "buffer", file, ok: false, error: err.message });
    }
  }

  const bloggerToken = process.env.BLOGGER_ACCESS_TOKEN;
  const bloggerBlogId = process.env.BLOGGER_BLOG_ID;
  if (bloggerToken && bloggerBlogId) {
    try {
      const post = await bloggerPost(article, bloggerToken, bloggerBlogId);
      if (post) {
        log(`  Blogger: "${article.title}"`);
        results.push({ platform: "blogger", file, ok: true });
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      log(`  Blogger FAILED: ${file} — ${err.message}`);
      results.push({ platform: "blogger", file, ok: false, error: err.message });
    }
  }

  const anySuccess = results.some(r => r.ok);
  if (anySuccess) {
    state.syndicated = state.syndicated || [];
    state.syndicated.push(file);
    saveState(state);
  }

  if (results.length) {
    const lines = [
      "## Syndication — Run",
      `**Date:** ${new Date().toISOString()}`,
      ...results.map(r => `- ${r.ok ? "OK" : "FAIL"} [${r.platform}] ${r.file}${r.url ? ` — ${r.url}` : ""}${r.error ? ` — ${r.error}` : ""}`),
      "",
      `${results.filter(r => r.ok).length}/${results.length} succeeded`,
      "",
      "*Auto-generated by Syndication Agent*",
    ];
    appendToReport("Syndication", lines.join("\n"));
  }

  log(`[Syndication] Done. ${results.filter(r => r.ok).length}/${results.length} posts succeeded.`);
  return { ok: true, syndicated: results.filter(r => r.ok).length, total: results.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSyndication().catch(console.error);
}
