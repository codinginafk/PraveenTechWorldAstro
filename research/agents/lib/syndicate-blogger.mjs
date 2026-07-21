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
  const lines = md.split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code blocks (``` or ~~~) ──────────────────────────────────
    const fenceMatch = line.match(/^(`{3,}|~{3,})([\w-]*)/);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const lang = fenceMatch[2] ? ` class="language-${fenceMatch[2]}"` : "";
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence)) {
        codeLines.push(
          lines[i]
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
        );
        i++;
      }
      out.push(`<pre><code${lang}>${codeLines.join("\n")}</code></pre>`);
      i++; // skip closing fence
      continue;
    }

    // ── Tables ────────────────────────────────────────────────────────────
    if (line.startsWith("|") && i + 1 < lines.length && lines[i + 1].match(/^\|[-| :]+\|/)) {
      const tableLines = [];
      tableLines.push(line);
      i++;
      const sepLine = lines[i]; // separator row — skip from output
      i++;
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const headerCells = tableLines[0].split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const rows = tableLines.slice(1).map(row =>
        row.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      );
      let tableHtml = `<table style="width:100%;border-collapse:collapse;margin:16px 0">\n<thead><tr>`;
      for (const cell of headerCells) {
        tableHtml += `<th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;text-align:left">${inlineFormat(cell.trim())}</th>`;
      }
      tableHtml += `</tr></thead>\n<tbody>`;
      for (const row of rows) {
        tableHtml += `<tr>`;
        for (const cell of row) {
          tableHtml += `<td style="border:1px solid #ddd;padding:8px">${inlineFormat(cell.trim())}</td>`;
        }
        tableHtml += `</tr>`;
      }
      tableHtml += `</tbody></table>`;
      out.push(tableHtml);
      continue;
    }

    // ── Blockquotes ───────────────────────────────────────────────────────
    if (line.startsWith("> ")) {
      const bqLines = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        bqLines.push(inlineFormat(lines[i].slice(2).trim()));
        i++;
      }
      out.push(`<blockquote style="border-left:4px solid #ccc;margin:12px 0;padding:8px 16px;color:#555">${bqLines.join("<br>")}</blockquote>`);
      continue;
    }

    // ── Headings ──────────────────────────────────────────────────────────
    const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      out.push(`<h${level}>${inlineFormat(hMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // ── Horizontal rule ───────────────────────────────────────────────────
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      out.push("<hr>");
      i++;
      continue;
    }

    // ── Ordered list ──────────────────────────────────────────────────────
    if (line.match(/^\d+\.\s/)) {
      const olItems = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        olItems.push(`<li>${inlineFormat(lines[i].replace(/^\d+\.\s/, "").trim())}</li>`);
        i++;
      }
      out.push(`<ol>${olItems.join("")}</ol>`);
      continue;
    }

    // ── Unordered list ────────────────────────────────────────────────────
    if (line.match(/^[-*+]\s/)) {
      const ulItems = [];
      while (i < lines.length && lines[i].match(/^[-*+]\s/)) {
        ulItems.push(`<li>${inlineFormat(lines[i].replace(/^[-*+]\s/, "").trim())}</li>`);
        i++;
      }
      out.push(`<ul>${ulItems.join("")}</ul>`);
      continue;
    }

    // ── Images ────────────────────────────────────────────────────────────
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2].startsWith("/") ? `${SITE_URL}${imgMatch[2]}` : imgMatch[2];
      out.push(`<figure style="margin:16px 0;text-align:center"><img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border-radius:4px"><figcaption style="font-size:0.85em;color:#666;margin-top:4px">${alt}</figcaption></figure>`);
      i++;
      continue;
    }

    // ── Empty line → paragraph break ──────────────────────────────────────
    if (line.trim() === "") {
      i++;
      continue;
    }

    // ── Regular paragraph ─────────────────────────────────────────────────
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== "" &&
      !lines[i].match(/^#{1,4}\s/) &&
      !lines[i].match(/^(`{3,}|~{3,})/) &&
      !lines[i].match(/^[-*+]\s/) &&
      !lines[i].match(/^\d+\.\s/) &&
      !lines[i].startsWith("|") &&
      !lines[i].startsWith("> ") &&
      !lines[i].match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      out.push(`<p>${inlineFormat(paraLines.join(" "))}</p>`);
    }
  }

  return out.join("\n");
}

// ── Inline formatting helper ──────────────────────────────────────────────
function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 5px;border-radius:3px;font-family:monospace">$1</code>')
    .replace(/\[([^\]]+)\]\((\/[^)]+)\)/g, `<a href="${SITE_URL}$2">$1</a>`)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/&(?!amp;|lt;|gt;|quot;)/g, "&amp;");
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
