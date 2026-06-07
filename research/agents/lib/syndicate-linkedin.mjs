import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "./shared.mjs";
import { parseArticle } from "./syndication.mjs";

const SITE_URL = "https://www.praveentechworld.com";
const AGENTS_DIR = path.resolve(import.meta.dirname, "..");
const OUTPUT_DIR = path.join(AGENTS_DIR, "linkedin-posts");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function generateHook(article) {
  if (article.socialHook) return article.socialHook;
  const title = article.title || "";
  const desc = article.description || "";
  return `${title}. ${desc.slice(0, 200)}`;
}

function extractInsights(body) {
  const headings = body.match(/^#{2,4}\s+(.+)$/gm) || [];
  return headings.slice(0, 4).map(h => h.replace(/^##?\s+/, "").trim());
}

export function generateLinkedInPost(article) {
  const articleUrl = `${SITE_URL}/blog/${article.slug}`;
  const lines = [];

  lines.push(generateHook(article));
  lines.push("");

  const body = article.body || "";
  const insights = extractInsights(body);
  if (insights.length > 0) {
    lines.push("Here is what stood out to me:");
    lines.push("");
    for (const insight of insights) {
      lines.push(`\u2022 ${insight}`);
    }
    lines.push("");
  }

  lines.push("What has been your experience with this? Drop a comment below.");
  lines.push("");

  const hashtags = (article.tags || []).map((t) => {
    const clean = t.replace(/[^a-zA-Z0-9]/g, "");
    return `#${clean}`;
  }).join(" ");
  lines.push(hashtags || "#Tech #Productivity #HowTo");

  return { text: lines.join("\n"), url: articleUrl, title: article.title };
}

export function generateLinkedInPostForArticle(filePath) {
  const article = parseArticle(filePath);
  if (!article) {
    log(`[LinkedIn] Could not parse article: ${filePath}`);
    return null;
  }

  const post = generateLinkedInPost(article);
  ensureDir(OUTPUT_DIR);

  const slug = article.slug || path.basename(filePath, ".mdx");
  const outputFile = path.join(OUTPUT_DIR, `${slug}-linkedin.txt`);
  const content = `${post.text}\n\n---\nURL (post as first comment): ${post.url}`;
  fs.writeFileSync(outputFile, content, "utf-8");

  log(`[LinkedIn] Post generated: ${outputFile}`);
  return { file: outputFile, ...post };
}

export async function publishToLinkedIn(post) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!accessToken || !personUrn) {
    log("[LinkedIn API] Missing LINKEDIN_ACCESS_TOKEN or LINKEDIN_PERSON_URN. Set them in .env");
    log("[LinkedIn API] To get a token: https://www.linkedin.com/developers/tools/oauth/token-generator");
    return null;
  }

  const author = `urn:li:person:${personUrn}`;

  try {
    log("[LinkedIn API] Creating post...");

    const postRes = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author,
        commentary: post.text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });

    if (!postRes.ok) {
      const err = await postRes.text();
      log(`[LinkedIn API] Post failed: ${postRes.status} ${err}`);
      return null;
    }

    const activityUrn = postRes.headers.get("x-restli-id");
    log(`[LinkedIn API] Post created: ${activityUrn}`);

    const commentRes = await fetch(
      `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(activityUrn)}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "LinkedIn-Version": "202401",
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actor: author,
          object: activityUrn,
          message: {
            text: post.url,
          },
        }),
      }
    );

    if (!commentRes.ok) {
      const err = await commentRes.text();
      log(`[LinkedIn API] Comment failed: ${commentRes.status} ${err}`);
      return { postUrn: activityUrn, commentError: err };
    }

    log(`[LinkedIn API] Comment posted with link: ${post.url}`);
    return { postUrn: activityUrn, postUrl: `https://www.linkedin.com/feed/update/${activityUrn}` };
  } catch (err) {
    log(`[LinkedIn API] Error: ${err.message}`);
    return null;
  }
}

export function generateLinkedInPostForLatest() {
  const articlesDir = path.resolve(import.meta.dirname, "../../src/content/articles");
  if (!fs.existsSync(articlesDir)) {
    log("[LinkedIn] Articles directory not found");
    return null;
  }

  const files = fs.readdirSync(articlesDir)
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .reverse()
    .slice(0, 1);

  if (files.length === 0) {
    log("[LinkedIn] No articles found");
    return null;
  }

  return generateLinkedInPostForArticle(path.join(articlesDir, files[0]));
}

export async function runLinkedInSyndication() {
  log("[LinkedIn] Running LinkedIn syndication...");
  const statePath = path.join(AGENTS_DIR, "state.json");
  let state = {};
  try { state = JSON.parse(fs.readFileSync(statePath, "utf-8")); } catch { }

  const linkedInSyndicated = state.linkedInSyndicated || [];

  const articlesDir = path.resolve(import.meta.dirname, "../../src/content/articles");
  if (!fs.existsSync(articlesDir)) return [];

  const files = fs.readdirSync(articlesDir)
    .filter((f) => f.endsWith(".mdx"))
    .filter((f) => !linkedInSyndicated.includes(f));

  const results = [];
  for (const file of files.slice(0, 3)) {
    const filePath = path.join(articlesDir, file);
    const post = generateLinkedInPostForArticle(filePath);
    if (!post) continue;

    const publishResult = await publishToLinkedIn(post);
    if (publishResult) {
      linkedInSyndicated.push(file);
      log(`[LinkedIn] Published: ${file}`);
      results.push({ file, ...publishResult });
    } else {
      log(`[LinkedIn] Generated file only (API not configured): ${file}`);
      results.push({ file, generated: true, published: false });
    }
  }

  state.linkedInSyndicated = linkedInSyndicated;
  state.lastLinkedInRun = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");

  if (results.some(r => r.published !== false)) {
    log(`[LinkedIn] Published ${results.filter(r => r.published !== false).length} post(s) via API`);
  }
  log(`[LinkedIn] Total: ${results.length} post(s) processed`);

  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLinkedInSyndication().catch(console.error);
}
