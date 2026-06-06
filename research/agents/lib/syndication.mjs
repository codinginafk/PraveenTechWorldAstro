import path from "path";
import fs from "fs";
import { log } from "./shared.mjs";

const SITE_URL = "https://www.praveentechworld.com";
const ARTICLES_DIR = path.resolve(import.meta.dirname, "../../../src/content/articles");

export function getNewArticles(syndicated) {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx"));
  const syndicatedSet = new Set(syndicated || []);
  return files.filter((f) => !syndicatedSet.has(f));
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
  const markdown = body
    .replace(/^---[\s\S]*?---\n*/m, "")
    .replace(/^## /gm, "## ")
    .trim();

  const payload = {
    article: {
      title,
      published: true,
      body_markdown: markdown,
      tags: formatTags(tags),
      canonical_url: `${SITE_URL}/blog/${slug}`,
      description: description.slice(0, 200),
      main_image: coverImage || "",
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
