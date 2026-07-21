import path from "path";
import fs from "fs";
import { log } from "./shared.mjs";

const SITE_URL = "https://www.praveentechworld.com";
const ARTICLES_DIR = path.resolve(import.meta.dirname, "../../../src/content/articles");

export function getNewArticles(syndicated) {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx"));
  const syndicatedSet = new Set(syndicated || []);
  return files
    .filter((f) => !syndicatedSet.has(f))
    .sort((a, b) => {
      const aTime = fs.statSync(path.join(ARTICLES_DIR, a)).mtimeMs;
      const bTime = fs.statSync(path.join(ARTICLES_DIR, b)).mtimeMs;
      return bTime - aTime; // newest first
    });
}

export function parseArticle(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return null;
  const body = fmMatch[2].trim();
  const fmRaw = fmMatch[1];
  const fm = {};
  const lines = fmRaw.split("\n");
  let currentKey = null;
  for (const line of lines) {
    const kv = line.match(/^(\w+):\s*(.*)/);
    if (kv) {
      const val = kv[2].trim();
      let parsedVal = val.replace(/^"(.*)"$/, "$1");
      // Parse YAML-like lists: "[a, b, c]" -> array
      if (parsedVal.startsWith("[") && parsedVal.endsWith("]")) {
        parsedVal = parsedVal.slice(1, -1).split(",").map(v => v.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      }
      // Parse faq which can be a multi-line YAML array
      if (kv[1] === "faq") {
        // FAQ is handled below via currentKey
        if (!val) {
          fm.faq = [];
          currentKey = "faq";
          continue;
        }
      }
      fm[kv[1]] = parsedVal;
      currentKey = val ? kv[1] : kv[1];
    } else if (currentKey === "tags" && line.trim().startsWith("- ")) {
      const tag = line.trim().slice(2).replace(/^"(.*)"$/, "$1").trim();
      if (!fm.tags) fm.tags = [];
      if (Array.isArray(fm.tags)) fm.tags.push(tag);
    } else if (currentKey === "faq" && line.trim().startsWith("- question:")) {
      if (!fm.faq) fm.faq = [];
    }
  }
  if (!Array.isArray(fm.tags)) fm.tags = [];
  if (!Array.isArray(fm.faq)) fm.faq = [];

  const slug = path.basename(filePath, ".mdx");

  return {
    title: fm.title || "Untitled",
    description: (fm.description || "").slice(0, 200),
    seoTitle: fm.seoTitle || "",
    socialHook: fm.socialHook || "",
    coverImage: fm.coverImage || "",
    imageAlt: fm.imageAlt || "",
    imageCredit: fm.imageCredit || "",
    publishDate: fm.publishDate || "",
    author: fm.author || "",
    category: fm.category || "",
    tags: fm.tags,
    canonical: fm.canonical || "",
    updatedDate: fm.updatedDate || "",
    faq: fm.faq,
    featured: fm.featured || false,
    readingTime: fm.readingTime || "",
    pillarId: fm.pillarId || "",
    slug,
    body,
    file: path.basename(filePath),
  };
}

const DEVTO_TAGS = new Set([
  "ai", "android", "api", "automation", "aws", "azure", "beginners", "blockchain",
  "career", "chatgpt", "cloud", "css", "database", "design", "devops", "devrel",
  "docker", "gcp", "git", "go", "html", "ios", "java", "javascript", "kubernetes",
  "linux", "lowcode", "machinelearning", "mongodb", "nextjs", "node", "npm",
  "opensource", "performance", "postgres", "privacy", "productivity", "python",
  "react", "saas", "security", "startup", "testing", "tutorial", "typescript",
  "webdev", "windows",
]);

export function formatTags(tags, max = 4) {
  return tags
    .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((t) => DEVTO_TAGS.has(t))
    .slice(0, max);
}

export const DEVTO_BASE = "https://dev.to/api";

export async function devtoPost(article, apiKey) {
  const { title, description, tags, coverImage, slug, body } = article;
  let markdown = body
    .replace(/^---[\s\S]*?---\n*/m, "")
    .replace(/^## /gm, "## ")
    .trim();

  // Rewrite relative image paths to absolute URLs on praveentechworld.com
  markdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    if (src.startsWith("/")) {
      return `![${alt}](${SITE_URL}${src})`;
    }
    return match;
  });

  const canonicalUrl = `${SITE_URL}/blog/${slug}`;

  const payload = {
    article: {
      title,
      published: true,
      body_markdown: markdown,
      tags: formatTags(tags),
      description: description.slice(0, 200),
      canonical_url: canonicalUrl,
      main_image: coverImage
        ? (coverImage.startsWith("http") ? coverImage : `${SITE_URL}${coverImage}`)
        : "",
    },
  };

  const res = await fetch(`${DEVTO_BASE}/articles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Dev.to ${res.status}: ${err.slice(0, 200)}`);
  }

  return await res.json();
}

export async function devtoUpdateProfile(apiKey, profile) {
  const payload = {
    user: {
      name: profile.name,
      bio: profile.bio,
      location: profile.location,
      website_url: profile.website_url,
      github_username: profile.github_username || "",
      twitter_username: profile.twitter_username || "",
    },
  };

  const res = await fetch(`${DEVTO_BASE}/users`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Dev.to profile ${res.status}: ${err.slice(0, 200)}`);
  }

  return await res.json();
}

export async function devtoFollowTags(apiKey, tags) {
  const results = [];
  for (const tag of tags) {
    try {
      const res = await fetch(`${DEVTO_BASE}/follows/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({ tag }),
      });
      const ok = res.ok;
      results.push({ tag, ok, status: res.status });
      if (!ok) log(`  Dev.to follow tag '${tag}': HTTP ${res.status}`);
    } catch (err) {
      results.push({ tag, ok: false, status: 0 });
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}

// ─── Hashnode ─────────────────────────────────────────────────────────────

// NOTE: Hashnode's GraphQL API became a paid offering on 2026-05-13.
// https://hashnode.com/changelog — Contact hello+support@hashnode.com to
// request allow-listing. Until then, these functions are stubs.

export async function hashnodeMe(_pat) {
  log("[Hashnode] API is now a paid offering — skipping");
  return null;
}

export async function hashnodePost(_article, _pat, _pubId) {
  log("[Hashnode] API is now a paid offering — skipping");
  return null;
}

// ─── LinkedIn ────────────────────────────────────────────────────────────

// LinkedIn API v2 requires OAuth 2.0 with w_member_social scope.
// Setup:
//   1. Go to https://www.linkedin.com/developers/apps → Create App
//   2. Add "Share on LinkedIn" product (w_member_social scope)
//   3. Set OAuth redirect URI to http://localhost:8080
//   4. Use the Authorize URL to get auth code:
//      https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=CLIENT_ID&redirect_uri=http://localhost:8080&scope=w_member_social,r_liteprofile,r_emailaddress
//   5. Exchange auth code for access token:
//      curl -X POST https://www.linkedin.com/oauth/v2/accessToken -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=http://localhost:8080&client_id=CLIENT_ID&client_secret=CLIENT_SECRET"
//   6. Set LINKEDIN_ACCESS_TOKEN in .env
//
// Note: LinkedIn restricts how often you can post same content.
// Only syndicate unique, condensed versions — not full reposts.

export async function linkedinPost(article, accessToken) {
  if (!accessToken) {
    log("[LinkedIn] No LINKEDIN_ACCESS_TOKEN in .env — skipping");
    return null;
  }
  if (!article || !article.slug) {
    log("[LinkedIn] Invalid article object — missing slug");
    return null;
  }
  const filePath = path.join(ARTICLES_DIR, `${article.slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    log(`[LinkedIn] Article file not found: ${filePath}`);
    return null;
  }
  try {
    const { generateLinkedInPostForArticle, publishToLinkedIn } = await import("./syndicate-linkedin.mjs");
    const post = generateLinkedInPostForArticle(filePath);
    if (!post) {
      log(`[LinkedIn] Failed to generate post for: ${article.slug}`);
      return null;
    }
    const result = await publishToLinkedIn(post, { svgPath: post.svgFile });
    if (result) {
      log(`[LinkedIn] Published: ${result.postUrl}`);
      return result;
    }
    log("[LinkedIn] publishToLinkedIn returned null (rate limited or error)");
    return null;
  } catch (err) {
    log(`[LinkedIn] Post failed: ${err.message}`);
    return null;
  }
}

// ─── Blogger ────────────────────────────────────────────────────────────

// Google Blogger API v3 requires OAuth 2.0 with blogger scope.
// Setup:
//   1. Go to https://console.cloud.google.com/ → Create Project → Enable Blogger API v3
//   2. Create OAuth 2.0 credentials (Desktop App type)
//   3. Download client_secret.json, save as research/agents/lib/blogger-client.json
//   4. Run the auth flow once to get refresh token:
//      const {google} = require('googleapis');
//      const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'http://localhost:8080');
//      const url = oauth2.generateAuthUrl({ scope: ['https://www.googleapis.com/auth/blogger'] });
//   5. Exchange the auth code: const {tokens} = await oauth2.getToken(code);
//   6. Set BLOGGER_ACCESS_TOKEN and BLOGGER_REFRESH_TOKEN in .env
//   7. Get your blog ID: GET https://www.googleapis.com/blogger/v3/users/self/blogs
//
// Note: Blogger API is free with daily quota (usually 1000 requests/day).

export async function bloggerPost(article, accessToken, blogId) {
  if (!accessToken || !blogId) {
    log("[Blogger] No BLOGGER_ACCESS_TOKEN or BLOGGER_BLOG_ID in .env — skipping");
    return null;
  }
  log("[Blogger] API requires OAuth 2.0 setup — see comments in syndication.mjs for instructions");
  log(`[Blogger] Would post: "${article.title}"`);
  return null;
}
