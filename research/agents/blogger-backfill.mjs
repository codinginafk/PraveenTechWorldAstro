import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.resolve(__dirname);
const ARTICLES_DIR = path.resolve(AGENTS_DIR, "../../src/content/articles");
const STATE_FILE = path.join(AGENTS_DIR, "state.json");
const OAUTH_FILE = path.join(AGENTS_DIR, "syndication/blogger-oauth.json");

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")); }
  catch { return {}; }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function loadOAuth() {
  if (!fs.existsSync(OAUTH_FILE)) throw new Error(`OAuth file not found: ${OAUTH_FILE}`);
  return JSON.parse(fs.readFileSync(OAUTH_FILE, "utf-8"));
}

async function refreshAccessToken(oauth) {
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
  return data.access_token;
}

function mdToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code blocks
    const fenceMatch = line.match(/^(`{3,}|~{3,})([\w-]*)/);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const lang = fenceMatch[2] ? ` class="language-${fenceMatch[2]}"` : "";
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence)) {
        codeLines.push(lines[i].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
        i++;
      }
      out.push(`<pre><code${lang}>${codeLines.join("\n")}</code></pre>`);
      i++;
      continue;
    }

    // Tables
    if (line.startsWith("|") && i + 1 < lines.length && lines[i + 1].match(/^\|[-| :]+\|/)) {
      const tableLines = [];
      tableLines.push(line);
      i++; i++; // skip separator
      while (i < lines.length && lines[i].startsWith("|")) { tableLines.push(lines[i]); i++; }
      const headerCells = tableLines[0].split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const rows = tableLines.slice(1).map(row => row.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1));
      let html = `<table style="width:100%;border-collapse:collapse;margin:16px 0"><thead><tr>`;
      for (const cell of headerCells) html += `<th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;text-align:left">${cell.trim()}</th>`;
      html += `</tr></thead><tbody>`;
      for (const row of rows) {
        html += `<tr>`;
        for (const cell of row) html += `<td style="border:1px solid #ddd;padding:8px">${cell.trim()}</td>`;
        html += `</tr>`;
      }
      html += `</tbody></table>`;
      out.push(html);
      continue;
    }

    // Blockquotes
    if (line.startsWith("> ")) {
      const bqLines = [];
      while (i < lines.length && lines[i].startsWith("> ")) { bqLines.push(lines[i].slice(2).trim()); i++; }
      out.push(`<blockquote style="border-left:4px solid #ccc;margin:12px 0;padding:8px 16px;color:#555">${bqLines.join("<br>")}</blockquote>`);
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) { out.push(`<h${hMatch[1].length}>${hMatch[2]}</h${hMatch[1].length}>`); i++; continue; }

    // HR
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) { out.push("<hr>"); i++; continue; }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) { items.push(`<li>${lines[i].replace(/^\d+\.\s/, "").trim()}</li>`); i++; }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Unordered list
    if (line.match(/^[-*+]\s/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*+]\s/)) { items.push(`<li>${lines[i].replace(/^[-*+]\s/, "").trim()}</li>`); i++; }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Images
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const src = imgMatch[2].startsWith("/") ? `https://www.praveentechworld.com${imgMatch[2]}` : imgMatch[2];
      out.push(`<figure style="margin:16px 0;text-align:center"><img src="${src}" alt="${imgMatch[1]}" style="max-width:100%;height:auto;border-radius:4px"></figure>`);
      i++; continue;
    }

    if (line.trim() === "") { i++; continue; }

    // Paragraph
    const paraLines = [];
    const startI = i;
    while (i < lines.length && lines[i].trim() !== "" &&
      !lines[i].match(/^#{1,4}\s/) && !lines[i].match(/^(`{3,}|~{3,})/) &&
      !lines[i].match(/^[-*+]\s/) && !lines[i].match(/^\d+\.\s/) &&
      !lines[i].startsWith("|") && !lines[i].startsWith("> ") &&
      !lines[i].match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) out.push(`<p>${paraLines.join(" ")}</p>`);
    else if (i === startI) { out.push(`<p>${lines[i]}</p>`); i++; }
  }

  return out.join("\n");
}

function parseArticle(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return null;
  const body = fmMatch[2].trim().replace(/^---[\s\S]*?---\n*/m, "").trim();
  const fmRaw = fmMatch[1];
  const fm = {};
  const lines = fmRaw.split("\n");
  for (const line of lines) {
    const kv = line.match(/^(\w+):\s*(.*)/);
    if (kv) {
      let val = kv[2].trim().replace(/^"(.*)"$/, "$1");
      fm[kv[1]] = val;
    }
  }
  return {
    title: fm.title || "Untitled",
    tags: (fm.tags || "").split(",").map(t => t.trim()).filter(Boolean),
    slug: path.basename(filePath, ".mdx"),
    body,
  };
}

async function publishOne(article, accessToken, blogId) {
  const htmlBody = mdToHtml(article.body);
  const canonicalUrl = `https://www.praveentechworld.com/blog/${article.slug}`;
  const content = `<p><em>Originally published at <a href="${canonicalUrl}">praveentechworld.com</a>.</em></p>\n${htmlBody}`;

  const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind: "blogger#post",
      title: article.title,
      content,
      labels: article.tags,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Blogger API ${res.status}: ${err.slice(0, 300)}`);
  }

  return await res.json();
}

async function main() {
  const state = loadState();
  const oauth = loadOAuth();
  const blogId = oauth.blog_id;

  // Determine which articles have been blogged
  const bloggedSlugs = new Set((state.bloggerPostLog || []).map(p => p.slug));

  // Get all articles
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx")).sort();
  const unblogged = files.filter(f => !bloggedSlugs.has(path.basename(f, ".mdx")));

  console.log(`Total articles: ${files.length}`);
  console.log(`Already on Blogger: ${bloggedSlugs.size}`);
  console.log(`Remaining to publish: ${unblogged.length}`);
  console.log(`Daily limit: 3 posts/day`);

  if (unblogged.length === 0) {
    console.log("\nAll articles already syndicated to Blogger!");
    return;
  }

  // Check daily quota
  const today = new Date().toISOString().slice(0, 10);
  if (state.bloggerPostDate !== today) {
    state.bloggerPostDate = today;
    state.bloggerDailyCount = 0;
  }

  const remainingToday = 3 - (state.bloggerDailyCount || 0);
  if (remainingToday <= 0) {
    console.log(`\nDaily limit reached (${state.bloggerDailyCount}/3). Come back tomorrow.`);
    console.log(`Next run will publish: ${unblogged.slice(0, 3).map(f => path.basename(f, ".mdx")).join(", ")}`);
    return;
  }

  const batch = unblogged.slice(0, remainingToday);
  console.log(`\nPublishing ${batch.length} articles today (${state.bloggerDailyCount || 0}/3 used):`);
  batch.forEach(f => console.log(`  - ${path.basename(f, ".mdx")}`));

  // Refresh token
  console.log("\nRefreshing access token...");
  const accessToken = await refreshAccessToken(oauth);
  console.log("Token OK");

  // Publish each
  for (const file of batch) {
    const filePath = path.join(ARTICLES_DIR, file);
    const article = parseArticle(filePath);
    if (!article) { console.log(`  SKIP (parse failed): ${file}`); continue; }

    const slug = path.basename(file, ".mdx");
    console.log(`\n  Publishing: ${article.title}...`);
    try {
      const data = await publishOne(article, accessToken, blogId);
      console.log(`  ✅ ${data.url}`);

      // Update state
      state.bloggerPostLog = state.bloggerPostLog || [];
      state.bloggerPostLog.push({
        time: new Date().toISOString(),
        slug,
        url: data.url,
        status: "published",
      });
      state.bloggerDailyCount = (state.bloggerDailyCount || 0) + 1;
      state.bloggerLastPost = new Date().toISOString();
      saveState(state);

      // 3s delay between posts
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.log(`  ❌ ${err.message}`);
    }
  }

  const published = state.bloggerPostLog?.length || 0;
  const remaining = files.length - published;
  const daysNeeded = Math.ceil(remaining / 3);
  console.log(`\nDone for today. Total published: ${published}/${files.length}`);
  console.log(`Remaining: ${remaining} (${daysNeeded} more days at 3/day)`);
  console.log(`\nRun this script again tomorrow to continue.`);
}

main().catch(console.error);
