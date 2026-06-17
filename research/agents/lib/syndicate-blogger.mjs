import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "./shared.mjs";
import { parseArticle } from "./syndication.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_URL = "https://www.praveentechworld.com";
const AGENTS_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(AGENTS_DIR, "blogger-posts");
const OAUTH_FILE = path.join(AGENTS_DIR, "syndication", "blogger-oauth.json");

const MAX_DAILY_POSTS = 3;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadOAuth() {
  if (!fs.existsSync(OAUTH_FILE)) {
    throw new Error(`Blogger OAuth file not found: ${OAUTH_FILE}`);
  }
  return JSON.parse(fs.readFileSync(OAUTH_FILE, "utf-8"));
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, "state.json"), "utf-8"));
  } catch { return {}; }
}

function saveState(state) {
  fs.writeFileSync(path.join(AGENTS_DIR, "state.json"), JSON.stringify(state, null, 2), "utf-8");
}

async function refreshAccessToken(oauth) {
  log("[Blogger API] Refreshing access token...");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: oauth.client_id,
      client_secret: oauth.client_secret,
      refresh_token: oauth.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Token refresh failed: ${res.status} ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  log("[Blogger API] Access token refreshed");
  return data.access_token;
}

function mdToHtml(md) {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((\/[^)]+)\)/g, `<a href="${SITE_URL}$2">$1</a>`)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/)[^)]+)\)/g, '<a href="$2">$1</a>');
  const blocks = html.split("\n\n");
  const out = [];
  for (const block of blocks) {
    const t = block.trim();
    if (!t) { out.push(""); continue; }
    if (/^<h[1-3]/.test(t)) { out.push(t); continue; }
    if (/^<hr\s*\/?>/.test(t)) { out.push(t); continue; }
    if (/^<(?:ul|ol|li|table|pre|blockquote)/.test(t)) { out.push(t); continue; }
    if (/^<li>/m.test(t)) { out.push(t); continue; }
    const lines = t.split("\n");
    let inList = false;
    const processed = [];
    for (const line of lines) {
      const trimmed = line.trim();
      const hMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (hMatch) {
        if (inList) { processed.push("</ul>"); inList = false; }
        const level = hMatch[1].length;
        processed.push(`<h${level}>${hMatch[2]}</h${level}>`);
      } else if (trimmed.startsWith("- ")) {
        if (!inList) { processed.push("<ul>"); inList = true; }
        processed.push(`<li>${trimmed.slice(2)}</li>`);
      } else if (trimmed === "---") {
        if (inList) { processed.push("</ul>"); inList = false; }
        processed.push("<hr>");
      } else {
        if (inList) { processed.push("</ul>"); inList = false; }
        if (trimmed) processed.push(`<p>${trimmed}</p>`);
      }
    }
    if (inList) processed.push("</ul>");
    out.push(processed.join("\n"));
  }
  return out.join("\n");
}

function formatBloggerPost(article) {
  const body = article.body || "";
  const cleanBody = body
    .replace(/^---[\s\S]*?---\n*/m, "")
    .trim();
  const htmlContent = mdToHtml(cleanBody);
  const articleUrl = `${SITE_URL}/blog/${article.slug}`;
  const canonicalNote = `<p><em>Originally published at <a href="${articleUrl}">${SITE_URL}</a>.</em></p>`;
  const content = `${canonicalNote}\n${htmlContent}`;
  return {
    title: article.title,
    content,
    labels: (article.tags || []).filter(Boolean),
    url: articleUrl,
  };
}

export function generateBloggerPostForArticle(filePath) {
  const article = parseArticle(filePath);
  if (!article) {
    log(`[Blogger] Could not parse article: ${filePath}`);
    return null;
  }
  const post = formatBloggerPost(article);
  ensureDir(OUTPUT_DIR);
  const slug = article.slug || path.basename(filePath, ".mdx");
  const outputFile = path.join(OUTPUT_DIR, `${slug}-blogger.txt`);
  const content = `TITLE: ${post.title}\n\n${post.content}\n\nLABELS: ${post.labels.join(", ")}\n\nCANONICAL: ${post.url}`;
  fs.writeFileSync(outputFile, content, "utf-8");
  log(`[Blogger] Post saved: ${outputFile}`);
  return { file: outputFile, title: post.title, content: post.content, labels: post.labels, url: post.url, slug, article };
}

export async function publishToBlogger(post) {
  let accessToken;
  try {
    const oauth = loadOAuth();
    accessToken = await refreshAccessToken(oauth);
  } catch (err) {
    log(`[Blogger API] Auth failed: ${err.message}`);
    return null;
  }
  const oauth = loadOAuth();
  const blogId = oauth.blog_id;
  if (!blogId) {
    log("[Blogger API] No blog_id in oauth config");
    return null;
  }
  const state = loadState();
  const today = new Date().toISOString().slice(0, 10);
  if (state.bloggerPostDate !== today) {
    state.bloggerPostDate = today;
    state.bloggerDailyCount = 0;
  }
  if ((state.bloggerDailyCount || 0) >= MAX_DAILY_POSTS) {
    log(`[Blogger API] Daily limit reached: ${state.bloggerDailyCount}/${MAX_DAILY_POSTS}`);
    return null;
  }
  try {
    const body = {
      kind: "blogger#post",
      title: post.title,
      content: post.content,
      labels: post.labels,
    };
    log(`[Blogger API] Creating post: "${post.title.slice(0, 60)}..."`);
    const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Blogger API ${res.status}: ${err.slice(0, 300)}`);
    }
    const data = await res.json();
    const postUrl = data.url;
    log(`[Blogger API] Post created: ${postUrl}`);
    state.bloggerLastPost = new Date().toISOString();
    state.bloggerDailyCount = (state.bloggerDailyCount || 0) + 1;
    state.bloggerPostLog = state.bloggerPostLog || [];
    state.bloggerPostLog.push({ time: state.bloggerLastPost, slug: post.slug, url: postUrl, status: "published" });
    if (state.bloggerPostLog.length > 50) state.bloggerPostLog = state.bloggerPostLog.slice(-50);
    saveState(state);
    return { postId: data.id, postUrl };
  } catch (err) {
    log(`[Blogger API] Post failed: ${err.message}`);
    state.bloggerPostLog = state.bloggerPostLog || [];
    state.bloggerPostLog.push({ time: new Date().toISOString(), error: err.message, status: "failed" });
    saveState(state);
    return null;
  }
}

function runPreview(slug) {
  const articlesDir = path.resolve(__dirname, "../../../src/content/articles");
  const filePath = path.join(articlesDir, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    console.log(`\n  \u2717 Article not found: ${slug}.mdx\n`);
    return;
  }
  const result = generateBloggerPostForArticle(filePath);
  if (!result) {
    console.log("\n  \u2717 Could not generate post\n");
    return;
  }
  console.log("\n" + "=".repeat(50));
  console.log("  BLOGGER POST PREVIEW");
  console.log("=".repeat(50));
  console.log("");
  console.log(`  Title: ${result.title}`);
  console.log(`  Labels: ${result.labels.join(", ")}`);
  console.log(`  Canonical: ${result.url}`);
  console.log(`  Content length: ${result.content.length} chars`);
  console.log("");
  const preview = result.content.length > 500 ? result.content.slice(0, 500) + "..." : result.content;
  console.log(`  ${preview}`);
  console.log("");
  console.log("=".repeat(50));
  console.log(`  Preview saved: ${result.file}`);
  console.log(`  Run: node research/agents/lib/syndicate-blogger.mjs publish ${slug}`);
  console.log("=".repeat(50), "\n");
}

async function runPublish(slug) {
  const articlesDir = path.resolve(__dirname, "../../../src/content/articles");
  const filePath = path.join(articlesDir, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    console.log(`\n  \u2717 Article not found: ${slug}.mdx\n`);
    return;
  }
  const result = generateBloggerPostForArticle(filePath);
  if (!result) {
    console.log("\n  \u2717 Could not generate post\n");
    return;
  }
  const publishResult = await publishToBlogger(result);
  if (publishResult) {
    console.log(`\n  \u2713 Published: ${publishResult.postUrl}\n`);
  } else {
    console.log("\n  \u2717 Publishing failed\n");
  }
}

async function runPublishLatest() {
  const articlesDir = path.resolve(__dirname, "../../../src/content/articles");
  if (!fs.existsSync(articlesDir)) {
    console.log("\n  \u2717 Articles directory not found\n");
    return;
  }
  const state = loadState();
  const syndicated = state.bloggerPostLog?.map(p => p.slug) || [];
  const files = fs.readdirSync(articlesDir)
    .filter(f => f.endsWith(".mdx"))
    .filter(f => !syndicated.includes(path.basename(f, ".mdx")))
    .sort()
    .reverse();
  if (files.length === 0) {
    console.log("\n  All articles already syndicated to Blogger\n");
    return;
  }
  const slug = path.basename(files[0], ".mdx");
  console.log(`\n  Publishing latest unsyndicated article: ${slug}\n`);
  await runPublish(slug);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || "preview";
  const slug = process.argv[3];
  if (command === "preview" && slug) {
    runPreview(slug);
  } else if (command === "publish" && slug) {
    runPublish(slug);
  } else if (command === "publish-latest") {
    runPublishLatest();
  } else if (command === "preview") {
    const articlesDir = path.resolve(__dirname, "../../../src/content/articles");
    if (fs.existsSync(articlesDir)) {
      const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx")).sort().reverse();
      if (files.length > 0) {
        const slug = path.basename(files[0], ".mdx");
        runPreview(slug);
      }
    }
  } else {
    console.log("\n  Usage:");
    console.log("    node syndicate-blogger.mjs preview [slug]    # Preview post");
    console.log("    node syndicate-blogger.mjs publish <slug>    # Publish to Blogger");
    console.log("    node syndicate-blogger.mjs publish-latest    # Publish latest unsyndicated");
    console.log("");
  }
}
