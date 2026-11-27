#!/usr/bin/env node
/**
 * scripts/syndicate-all.mjs
 * Unified multi-platform syndication dispatcher for PraveenTechWorld.
 *
 * Syncs a single published Astro article across:
 *   1. DEV.to (full Markdown with canonical_url + absolute backlinks)
 *   2. LinkedIn (first-person dwell-time post + hero PNG + comment #1 link; auto-refreshes OAuth)
 *   3. X / Twitter (4-tweet thread + hero image; resilient 402/credit fallback)
 *   4. IndexNow (instant search indexing notification)
 *
 * Usage:
 *   node --env-file=.env scripts/syndicate-all.mjs --slug <slug> [--dry-run] [--save-pack]
 *   node --env-file=.env scripts/syndicate-all.mjs --slug <slug> --approve
 *   node --env-file=.env scripts/syndicate-all.mjs --latest [--dry-run] [--save-pack]
 *   node --env-file=.env scripts/syndicate-all.mjs --slug <slug> --platforms devto,linkedin,x,indexnow --approve
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TwitterApi } from "twitter-api-v2";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "src", "content", "articles");
const STATE_PATH = path.join(ROOT, "research", "agents", "state.json");
const SOCIAL_PACK_DIR = path.join(ROOT, "social_posts");
const ENV_PATH = path.join(ROOT, ".env");

const SITE_URL = "https://www.praveentechworld.com";
const INDEXNOW_KEY = "b5ccb860-ee82-4baa-9416-61b965ff55d7";
const LINKEDIN_API_VERSION = "202610";

const ALLOWED_DEVTO_TAGS = new Set([
  "ai", "android", "api", "automation", "aws", "azure", "beginners", "blockchain",
  "career", "chatgpt", "cloud", "css", "database", "design", "devops", "devrel",
  "docker", "gcp", "git", "go", "hardware", "homelab", "html", "ios", "java",
  "javascript", "kubernetes", "linux", "lowcode", "machinelearning", "mongodb",
  "nextjs", "node", "npm", "opensource", "performance", "postgres", "privacy",
  "productivity", "python", "react", "saas", "security", "selfhosted", "startup",
  "testing", "troubleshooting", "tutorial", "typescript", "webdev", "windows",
]);

const CUSTOM_ASTRO_COMPONENTS = [
  "ErrorLookupBar",
  "DeGoogleScoreCalculator",
  "OSCompromisesNavigator",
  "OSDowntimeMonitor",
  "VramMiniWidget",
];

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    slug: null,
    latest: false,
    dryRun: argv.includes("--dry-run"),
    approve: argv.includes("--approve"),
    savePack: argv.includes("--save-pack"),
    force: argv.includes("--force"),
    platforms: new Set(["devto", "linkedin", "x", "indexnow"]),
  };

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--slug" && argv[i + 1]) {
      args.slug = argv[++i].replace(/\.mdx$/, "");
    } else if (argv[i] === "--latest") {
      args.latest = true;
    } else if (argv[i] === "--platforms" && argv[i + 1]) {
      args.platforms = new Set(
        argv[++i].split(",").map((p) => p.trim().toLowerCase()).filter(Boolean)
      );
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// State & Env Helpers
// ---------------------------------------------------------------------------

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function updateEnvKey(key, value) {
  if (!fs.existsSync(ENV_PATH) || !value) return;
  let env = fs.readFileSync(ENV_PATH, "utf8");
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  env = pattern.test(env) ? env.replace(pattern, line) : `${env.trimEnd()}\n${line}\n`;
  fs.writeFileSync(ENV_PATH, env, "utf8");
}

// ---------------------------------------------------------------------------
// Frontmatter & MDX Article Loader
// ---------------------------------------------------------------------------

function unquote(str) {
  const s = (str || "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return s;
}

function parseArticleFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Invalid MDX frontmatter in ${filePath}`);

  const [, fmBlock, body] = match;
  const fm = { tags: [], quickAnswer: {} };
  const lines = fmBlock.split("\n");
  let section = null;

  for (const line of lines) {
    const topKv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (topKv) {
      const key = topKv[1];
      const val = topKv[2].trim();
      section = val ? null : key;
      if (key === "tags" && val.startsWith("[") && val.endsWith("]")) {
        fm.tags = val.slice(1, -1).split(",").map((t) => unquote(t)).filter(Boolean);
      } else if (val) {
        fm[key] = unquote(val);
      }
      continue;
    }

    if (section === "tags" && line.trim().startsWith("- ")) {
      fm.tags.push(unquote(line.trim().slice(2)));
    } else if (section === "quickAnswer") {
      const subKv = line.match(/^\s+([A-Za-z0-9_]+):\s*(.*)$/);
      if (subKv) fm.quickAnswer[subKv[1]] = unquote(subKv[2]);
    }
  }

  const slug = path.basename(filePath, ".mdx");
  const canonicalUrl = `${SITE_URL}/blog/${slug}`;
  const coverImageRel = (fm.coverImage || "").replace(/^[\/\\]/, "");
  const coverImageAbs = coverImageRel ? path.join(ROOT, "public", coverImageRel) : null;

  return {
    slug,
    filePath,
    canonicalUrl,
    draft: fm.draft === "true",
    title: fm.seoTitle || fm.title || slug,
    rawTitle: fm.title || slug,
    description: fm.description || "",
    socialHook: fm.socialHook || "",
    category: fm.category || "windows-fixes",
    tags: fm.tags,
    publishDate: fm.publishDate || "",
    updatedDate: fm.updatedDate || "",
    coverImage: fm.coverImage || "",
    coverImagePath: coverImageAbs && fs.existsSync(coverImageAbs) ? coverImageAbs : null,
    quickAnswer: fm.quickAnswer,
    body: body.trim(),
  };
}

function findLatestPublishedArticle() {
  const candidates = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => parseArticleFile(path.join(ARTICLES_DIR, f)))
    .filter((a) => !a.draft);

  candidates.sort((a, b) => (b.updatedDate || b.publishDate).localeCompare(a.updatedDate || a.publishDate));
  return candidates[0] || null;
}

// ---------------------------------------------------------------------------
// Content Sanitizers & Platform Formatters
// ---------------------------------------------------------------------------

function extractSectionHeadings(body) {
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) =>
    m[1].replace(/[*`]/g, "").trim()
  );
  const filtered = headings.filter(
    (h) => !/^(jump to|related|faq|frequently asked|conclusion|references|what (causes|is) )/i.test(h)
  );
  const actionSteps = filtered.filter((h) => !/(matrix|we see most often|comparison)/i.test(h));
  return actionSteps.length >= 2 ? actionSteps : filtered;
}

function stripMarkdownSafe(text) {
  return (text || "")
    .replace(/[`*>\[\]]/g, "")
    .replace(/(?<!\w)_|_(?!\w)/g, "");
}

function extractSentences(text) {
  return stripMarkdownSafe(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25);
}

function mapDevToTags(articleTags, category) {
  const normalized = [...(articleTags || []), category]
    .map((t) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, ""))
    .map((t) => {
      if (t === "windowsfixes" || t === "windows11") return "windows";
      if (t === "hardwaretroubleshooting") return "hardware";
      if (t === "aiautomation" || t === "aitools") return "ai";
      return t;
    })
    .filter((t) => ALLOWED_DEVTO_TAGS.has(t));

  const unique = [...new Set(normalized)].slice(0, 4);
  return unique.length > 0 ? unique : ["devops", "tutorial"];
}

/** Convert Astro MDX into clean DEV.to Markdown with absolute canonical backlinks. */
function formatForDevTo(article) {
  let md = article.body;

  // Remove Astro component imports outside fenced code blocks
  md = md.replace(/^import\s+[\w\s{},*]+\s+from\s+["']@components\/[^"']+["'];?\s*$/gm, "");

  // Replace known interactive Astro components with clean markdown tool links
  const componentPattern = new RegExp(`<(${CUSTOM_ASTRO_COMPONENTS.join("|")})\\b[^>]*\\/?>`, "g");
  md = md.replace(
    componentPattern,
    `> **Interactive Tool:** Test this fix with the interactive workbench tool on [PraveenTechWorld](${article.canonicalUrl}).`
  );

  // Rewrite relative image paths and internal site links to absolute URLs
  md = md.replace(/!\[([^\]]*)\]\((\/[^)]+)\)/g, (_, alt, rel) => `![${alt}](${SITE_URL}${rel})`);
  md = md.replace(/(?<!!)\[([^\]]+)\]\((\/[^)]+)\)/g, (_, text, rel) => `[${text}](${SITE_URL}${rel})`);

  const footer = `\n\n---\n*Originally tested and published on [PraveenTechWorld](${article.canonicalUrl}).*`;

  return {
    title: article.rawTitle,
    published: true,
    body_markdown: `${md.trim()}${footer}`,
    tags: mapDevToTags(article.tags, article.category),
    canonical_url: article.canonicalUrl,
    description: article.description.slice(0, 160),
    main_image: article.coverImage ? `${SITE_URL}${article.coverImage}` : undefined,
  };
}

function humanizeSocialHook(text) {
  return stripMarkdownSafe(text)
    .replace(/\bHere is why\b/gi, "Here is maybe why")
    .replace(/\bIn this guide,\s*/gi, "")
    .replace(/\bour team resolved\b/gi, "we fixed")
    .replace(/\bour engineering team\b/gi, "we")
    .replace(/\bby addressing two distinct bottlenecks:\s*/gi, "after tracing two issues: ")
    .replace(/\bOn our test bench running ([^,]+),\s*/gi, "On a $1 machine, ")
    .trim();
}

/** Build LinkedIn post using curated override file if present, or natural human copy. */
function formatForLinkedIn(article) {
  const mdOverride = path.join(SOCIAL_PACK_DIR, `${article.slug}-linkedin.md`);
  const txtOverride = path.join(SOCIAL_PACK_DIR, `${article.slug}-linkedin.txt`);
  const overridePath = fs.existsSync(mdOverride) ? mdOverride : txtOverride;
  const hashtags = [...new Set([article.category, ...(article.tags || [])])]
    .filter(Boolean)
    .slice(0, 4)
    .map((t) => `#${t.replace(/[^a-zA-Z0-9]/g, "")}`)
    .join(" ");

  if (fs.existsSync(overridePath)) {
    const customText = fs.readFileSync(overridePath, "utf8").trim();
    return {
      text: customText,
      commentText: `Full steps and copy-paste commands are here: ${article.canonicalUrl}`,
      title: article.rawTitle,
      canonicalUrl: article.canonicalUrl,
      imagePath: article.coverImagePath,
      customOverride: true,
    };
  }

  const hookSource = humanizeSocialHook(article.socialHook || article.description);
  const hookSentences = extractSentences(hookSource);
  const openerLines =
    hookSentences.length >= 2
      ? [hookSentences[0], "", hookSentences[1]]
      : [article.rawTitle, "", hookSource];

  const headings = extractSectionHeadings(article.body).slice(0, 3);
  const bullets =
    headings.length > 0
      ? headings.map((h, i) => `${i + 1}. ${h}`).join("\n")
      : `1. Track down the exact error trigger\n2. Clean out bad state or drivers\n3. Verify under heavy load`;

  const quickTakeaway = humanizeSocialHook(
    extractSentences(article.description || article.quickAnswer?.summary).slice(0, 2).join(" ")
  );

  let closingQuestion = "Have you run into this same fault on Windows 11 lately?";
  if (["privacy", "security", "homelab", "android-fixes"].includes(article.category)) {
    closingQuestion = "Which Google or cloud tool gave you the hardest time when moving off it?";
  } else if (["ai", "ai-automation", "ai-tools", "ai-workflows"].includes(article.category)) {
    closingQuestion = "Are you running this on your own hardware now or still paying cloud API bills?";
  }

  const text = [
    ...openerLines,
    "",
    quickTakeaway,
    "",
    "How we resolved this on the workbench is as follows:",
    bullets,
    "",
    closingQuestion,
    "",
    "Full notes and copy-paste commands are in the first comment below.",
    "",
    hashtags || "#ITOps #DevOps #SystemsEngineering",
  ]
    .join("\n")
    .trim();

  return {
    text,
    commentText: `Full steps and copy-paste commands are here: ${article.canonicalUrl}`,
    title: article.rawTitle,
    canonicalUrl: article.canonicalUrl,
    imagePath: article.coverImagePath,
    customOverride: false,
  };
}

function truncateForTweet(text, maxLen) {
  if (text.length <= maxLen) return text;
  const sliced = text.slice(0, maxLen - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const clean = lastSpace > maxLen * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${clean.trimEnd()}…`;
}

/** Build a 4-tweet thread (Tweet 1 link-free for reach, Tweet 4 carries canonical link). */
function formatForXThread(article) {
  const hook = humanizeSocialHook(article.socialHook || article.description);
  const qaSentences = extractSentences(humanizeSocialHook(article.description || article.quickAnswer?.summary));
  const headings = extractSectionHeadings(article.body).slice(0, 3);
  const cmd = article.quickAnswer?.command ? article.quickAnswer.command.trim() : "";

  const t1 = truncateForTweet(`${hook}\n\nWhat we tested on the workbench (thread):`, 275);

  const rootCause = qaSentences[0] || stripMarkdownSafe(article.description);
  const cmdBlock = cmd && cmd.length <= 110 ? `\n\nCommand:\n${cmd}` : "";
  const t2 = cmdBlock && (`1/ What broke:\n\n${rootCause}`.length + cmdBlock.length <= 275)
    ? `1/ What broke:\n\n${rootCause}${cmdBlock}`
    : truncateForTweet(`1/ What broke:\n\n${rootCause}`, 275);

  const fixSteps =
    headings.length > 0
      ? headings.map((h) => `• ${h}`).join("\n")
      : qaSentences.slice(1, 3).join(" ");
  const cmdInT3 = (!cmdBlock || t2.indexOf(cmd) === -1) && cmd && cmd.length <= 120
    ? `\n\nCommand:\n${cmd}`
    : "";
  const t3Raw = `2/ How we resolved this on the workbench:\n\n${fixSteps}${cmdInT3}`;
  const t3 = truncateForTweet(t3Raw, 275);

  const hashtags = (article.tags || [])
    .slice(0, 2)
    .map((t) => `#${t.replace(/[^a-zA-Z0-9]/g, "")}`)
    .join(" ");
  // Account for t.co wrapping URLs to 23 chars
  const t4Prefix = `Full copy-paste runbook and benchmarks:\n\n`;
  const t4 = `${t4Prefix}${article.canonicalUrl}${hashtags ? `\n\n${hashtags}` : ""}`;

  return [t1, t2, t3, t4];
}

// ---------------------------------------------------------------------------
// API Dispatchers
// ---------------------------------------------------------------------------

async function dispatchDevTo(article, payload, { dryRun, force }) {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) return { ok: false, skipped: true, reason: "DEVTO_API_KEY missing" };

  // Check live DEV.to articles to match canonical_url (both apex and www)
  const listRes = await fetch("https://dev.to/api/articles/me/all?per_page=100", {
    headers: { "api-key": apiKey },
  });
  if (!listRes.ok) {
    return { ok: false, reason: `DEV.to list check HTTP ${listRes.status}` };
  }
  const existingList = await listRes.json();
  const targetPath = `/blog/${article.slug}`;
  const existing = Array.isArray(existingList)
    ? existingList.find((a) => (a.canonical_url || "").replace(/\/$/, "").endsWith(targetPath))
    : null;

  if (dryRun) {
    const action = !existing
      ? "POST /articles"
      : !existing.published
        ? `PUT /articles/${existing.id} (publish draft)`
        : force
          ? `PUT /articles/${existing.id} (force update)`
          : "SKIP (already published)";
    return {
      ok: true,
      dryRun: true,
      action,
      canonical: payload.canonical_url,
      tags: payload.tags,
      bodyChars: payload.body_markdown.length,
      existingUrl: existing?.url || null,
    };
  }

  if (existing && existing.published && !force) {
    return { ok: true, skipped: true, reason: "Already on DEV.to (use --force to update)", url: existing.url };
  }

  const endpoint = existing
    ? `https://dev.to/api/articles/${existing.id}`
    : "https://dev.to/api/articles";
  const method = existing ? "PUT" : "POST";

  const res = await fetch(endpoint, {
    method,
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ article: payload }),
  });

  if (!res.ok) {
    return { ok: false, reason: `DEV.to ${method} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }

  const data = await res.json();
  return { ok: true, id: data.id, url: data.url, updated: Boolean(existing) };
}

async function getValidLinkedInToken({ dryRun }) {
  let token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (token) {
    const check = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (check.ok) return { token, refreshed: false };
  }

  if (!process.env.LINKEDIN_REFRESH_TOKEN || !process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    throw new Error("LinkedIn token expired and refresh credentials are missing.");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: process.env.LINKEDIN_REFRESH_TOKEN,
    client_id: process.env.LINKEDIN_CLIENT_ID,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
  });

  const refreshRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!refreshRes.ok) {
    throw new Error(`LinkedIn refresh failed HTTP ${refreshRes.status}: ${await refreshRes.text()}`);
  }

  const data = await refreshRes.json();
  if (!dryRun) {
    updateEnvKey("LINKEDIN_ACCESS_TOKEN", data.access_token);
    if (data.refresh_token) updateEnvKey("LINKEDIN_REFRESH_TOKEN", data.refresh_token);
  }
  return { token: data.access_token, refreshed: true };
}

async function uploadLinkedInImage(token, authorUrn, imagePath) {
  const sharp = (await import("sharp")).default;
  const pngBuffer = await sharp(fs.readFileSync(imagePath))
    .resize(1200, 630, { fit: "contain", background: { r: 249, g: 248, b: 246, alpha: 1 } })
    .png()
    .toBuffer();

  const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": LINKEDIN_API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn } }),
  });

  if (!initRes.ok) throw new Error(`LinkedIn image init HTTP ${initRes.status}`);
  const initData = await initRes.json();
  const uploadUrl = initData.value?.uploadUrl;
  const imageUrn = initData.value?.image;
  if (!uploadUrl || !imageUrn) throw new Error("LinkedIn image init response missing uploadUrl/image");

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/png" },
    body: pngBuffer,
  });
  if (!putRes.ok) throw new Error(`LinkedIn image upload HTTP ${putRes.status}`);
  return imageUrn;
}

async function dispatchLinkedIn(article, liPayload, { dryRun, state, force }) {
  const personId = process.env.LINKEDIN_PERSON_URN;
  if (!personId) return { ok: false, skipped: true, reason: "LINKEDIN_PERSON_URN missing" };

  const alreadySent = (state.linkedInPostLog || []).some(
    (p) => p.slug === article.slug && p.status === "published"
  );
  if (alreadySent && !force && !dryRun) {
    return { ok: true, skipped: true, reason: "Already posted to LinkedIn (use --force to re-post)" };
  }

  let auth;
  try {
    auth = await getValidLinkedInToken({ dryRun });
  } catch (err) {
    return { ok: false, reason: err.message };
  }

  const authorUrn = personId.startsWith("urn:") ? personId : `urn:li:person:${personId}`;

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      tokenRefreshedInMemory: auth.refreshed,
      authorUrn,
      hasHeroImage: Boolean(liPayload.imagePath),
      charCount: liPayload.text.length,
    };
  }

  let mediaUrn = null;
  if (liPayload.imagePath) {
    try {
      mediaUrn = await uploadLinkedInImage(auth.token, authorUrn, liPayload.imagePath);
    } catch (err) {
      console.warn(`[LinkedIn] Image upload skipped (${err.message}); falling back to article card.`);
    }
  }

  const postBody = {
    author: authorUrn,
    commentary: liPayload.text,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
    content: mediaUrn
      ? { media: { id: mediaUrn, title: liPayload.title } }
      : {
          article: {
            source: liPayload.canonicalUrl,
            title: liPayload.title,
            description: article.description.slice(0, 200),
          },
        },
  };

  const postRes = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "LinkedIn-Version": LINKEDIN_API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postBody),
  });

  if (!postRes.ok) {
    return { ok: false, reason: `LinkedIn POST HTTP ${postRes.status}: ${(await postRes.text()).slice(0, 200)}` };
  }

  const postUrn = postRes.headers.get("x-restli-id");
  const postUrl = `https://www.linkedin.com/feed/update/${postUrn}`;

  // Attempt automated first comment with canonical URL
  let commentPosted = false;
  if (postUrn) {
    try {
      const commentRes = await fetch(
        `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "LinkedIn-Version": LINKEDIN_API_VERSION,
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            actor: authorUrn,
            message: { text: liPayload.commentText },
          }),
        }
      );
      commentPosted = commentRes.ok;
    } catch {
      commentPosted = false;
    }
  }

  return { ok: true, postUrn, url: postUrl, commentPosted };
}

function xWeightedLength(tweet) {
  return tweet.replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
}

async function dispatchXThread(article, tweets, { dryRun, state, force }) {
  const { TWITTER_API_KEY, TWITTER_API_KEY_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET } = process.env;
  if (!TWITTER_API_KEY || !TWITTER_API_KEY_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_TOKEN_SECRET) {
    return { ok: false, skipped: true, reason: "Twitter API credentials missing" };
  }

  const alreadySent = (state.twitterPostLog || []).some(
    (p) => p.slug === article.slug && p.status === "published"
  );
  if (alreadySent && !force && !dryRun) {
    return { ok: true, skipped: true, reason: "Already posted to X (use --force to re-post)" };
  }

  const client = new TwitterApi({
    appKey: TWITTER_API_KEY,
    appSecret: TWITTER_API_KEY_SECRET,
    accessToken: TWITTER_ACCESS_TOKEN,
    accessSecret: TWITTER_ACCESS_TOKEN_SECRET,
  });

  if (dryRun) {
    let me = null;
    try {
      const res = await client.v2.me();
      me = `@${res.data.username}`;
    } catch (e) {
      me = `Auth check failed (${e.message})`;
    }
    return {
      ok: true,
      dryRun: true,
      account: me,
      tweetCount: tweets.length,
      tweetWeightedLengths: tweets.map((t) => xWeightedLength(t)),
      allWithin280: tweets.every((t) => xWeightedLength(t) <= 280),
      hasHeroImage: Boolean(article.coverImagePath),
    };
  }

  try {
    let mediaId = null;
    if (article.coverImagePath) {
      try {
        const mimeType = article.coverImagePath.endsWith(".png") ? "image/png" : "image/jpeg";
        mediaId = await client.v1.uploadMedia(fs.readFileSync(article.coverImagePath), { mimeType });
      } catch (imgErr) {
        console.warn(`[X] Media upload skipped (${imgErr.message}); posting text thread.`);
      }
    }

    let lastTweetId = null;
    let firstUrl = null;
    for (let i = 0; i < tweets.length; i++) {
      const payload = { text: tweets[i] };
      if (i === 0 && mediaId) payload.media = { media_ids: [mediaId] };
      if (lastTweetId) payload.reply = { in_reply_to_tweet_id: lastTweetId };
      const posted = await client.v2.tweet(payload);
      lastTweetId = posted.data.id;
      if (i === 0) firstUrl = `https://x.com/i/status/${lastTweetId}`;
    }
    return { ok: true, url: firstUrl, threadLength: tweets.length };
  } catch (err) {
    const code = err?.code || err?.data?.status || "";
    const isPaymentRequired = String(code) === "402" || String(err.message).includes("402");
    return {
      ok: false,
      code,
      paymentRequired: isPaymentRequired,
      reason: isPaymentRequired
        ? "HTTP 402 Payment Required — X Developer API write credits exhausted. Use saved social_posts pack or top up X API credits."
        : `X API error: ${err.message}`,
    };
  }
}

async function dispatchIndexNow(url, { dryRun }) {
  if (dryRun) return { ok: true, dryRun: true, url };
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: "www.praveentechworld.com",
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: [url],
    }),
  });
  return { ok: res.ok, status: res.status };
}

function writeSocialPack(article, devtoPayload, liPayload, xTweets) {
  fs.mkdirSync(SOCIAL_PACK_DIR, { recursive: true });
  const packPath = path.join(SOCIAL_PACK_DIR, `${article.slug}-pack.md`);
  const devtoPath = path.join(SOCIAL_PACK_DIR, `${article.slug}-devto.md`);

  const devtoFileContent = [
    "---",
    `title: "${devtoPayload.title.replace(/"/g, '\\"')}"`,
    `published: ${devtoPayload.published}`,
    `description: "${devtoPayload.description.replace(/"/g, '\\"')}"`,
    `tags: [${devtoPayload.tags.join(", ")}]`,
    `canonical_url: "${devtoPayload.canonical_url}"`,
    devtoPayload.main_image ? `cover_image: "${devtoPayload.main_image}"` : null,
    "---",
    "",
    devtoPayload.body_markdown,
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");

  fs.writeFileSync(devtoPath, devtoFileContent, "utf8");

  const content = [
    `# Multi-Platform Distribution Pack: ${article.rawTitle}`,
    `- **Canonical URL:** ${article.canonicalUrl}`,
    `- **DEV.to Tags:** ${devtoPayload.tags.join(", ")}`,
    `- **DEV.to Body File:** [social_posts/${article.slug}-devto.md](${article.slug}-devto.md) (${devtoPayload.body_markdown.length} chars)`,
    `- **Hero Image:** ${article.coverImage || "None"}`,
    "",
    "---",
    "",
    "## 1. LinkedIn Post",
    "```text",
    liPayload.text,
    "```",
    `**First Comment:** \`${liPayload.commentText}\``,
    "",
    "---",
    "",
    "## 2. X (Twitter) 4-Tweet Thread",
    ...xTweets.map((t, i) => `### Tweet ${i + 1} (raw: ${t.length} / weighted: ${xWeightedLength(t)} chars)\n\`\`\`text\n${t}\n\`\`\``),
    "",
  ].join("\n");

  fs.writeFileSync(packPath, content, "utf8");
  return { packPath, devtoPath };
}

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const article = args.slug
    ? parseArticleFile(path.join(ARTICLES_DIR, `${args.slug}.mdx`))
    : args.latest
      ? findLatestPublishedArticle()
      : null;

  if (!article) {
    console.error("Usage: node --env-file=.env scripts/syndicate-all.mjs --slug <slug> | --latest [--dry-run] [--save-pack] [--approve] [--force]");
    process.exit(1);
  }

  // Enforce explicit human approval before any external platform write
  if (!args.dryRun && !args.approve) {
    console.error(
      `BLOCKED: Live external publishing requires --approve after reviewing the generated packs.\n` +
      `Run with --dry-run --save-pack first, review social_posts/${article.slug}-pack.md and ${article.slug}-devto.md, then re-run with --approve.`
    );
    process.exit(2);
  }

  if (article.draft && !args.dryRun) {
    console.error(`REFUSED: "${article.slug}" has draft: true. Publish it cleanly before syndicating.`);
    process.exit(1);
  }

  console.log(`\n=== Unified Syndication ${args.dryRun ? "(DRY RUN) " : "(APPROVED LIVE RUN) "}===`);
  console.log(`Article:   ${article.rawTitle}`);
  console.log(`Canonical: ${article.canonicalUrl}`);
  console.log(`Platforms: ${[...args.platforms].join(", ")}`);

  const devtoPayload = formatForDevTo(article);
  const liPayload = formatForLinkedIn(article);
  const xTweets = formatForXThread(article);

  if (args.savePack || !args.dryRun) {
    const { packPath, devtoPath } = writeSocialPack(article, devtoPayload, liPayload, xTweets);
    console.log(`Social Pack: ${path.relative(ROOT, packPath)}`);
    console.log(`DEV.to Pack: ${path.relative(ROOT, devtoPath)}`);
  }

  const state = loadState();
  const report = {};

  if (args.platforms.has("devto")) {
    report.devto = await dispatchDevTo(article, devtoPayload, args);
    console.log("[DEV.to]", JSON.stringify(report.devto));
  }

  if (args.platforms.has("linkedin")) {
    report.linkedin = await dispatchLinkedIn(article, liPayload, { ...args, state });
    console.log("[LinkedIn]", JSON.stringify(report.linkedin));
  }

  if (args.platforms.has("x")) {
    report.x = await dispatchXThread(article, xTweets, { ...args, state });
    console.log("[X / Twitter]", JSON.stringify(report.x));
  }

  if (args.platforms.has("indexnow")) {
    report.indexnow = await dispatchIndexNow(article.canonicalUrl, args);
    console.log("[IndexNow]", JSON.stringify(report.indexnow));
  }

  if (args.dryRun) {
    console.log("\n--- LinkedIn Preview ---\n" + liPayload.text);
    console.log("\n--- X Thread Preview ---");
    xTweets.forEach((t, i) => console.log(`[Tweet ${i + 1} (${t.length} chars)]\n${t}\n`));
  } else {
    // Update state.json ledger cleanly
    const now = new Date().toISOString();
    state.syndicated = state.syndicated || [];
    if (!state.syndicated.includes(`${article.slug}.mdx`)) state.syndicated.push(`${article.slug}.mdx`);

    if (report.devto?.ok && !report.devto.skipped) {
      state.devtoPosts = state.devtoPosts || [];
      state.devtoPosts.push({ id: report.devto.id, time: Date.now(), url: report.devto.url, article: article.slug });
    }
    if (report.linkedin?.ok && !report.linkedin.skipped) {
      state.linkedInLastPost = now;
      state.linkedInPostLog = state.linkedInPostLog || [];
      state.linkedInPostLog.push({ time: now, slug: article.slug, url: report.linkedin.url, status: "published" });
    }
    if (report.x && !report.x.skipped) {
      state.twitterPostLog = state.twitterPostLog || [];
      state.twitterPostLog.push({
        time: now,
        slug: article.slug,
        url: report.x.url || "",
        error: report.x.ok ? undefined : report.x.reason,
        status: report.x.ok ? "published" : "failed",
      });
    }
    saveState(state);
    console.log("\nUpdated research/agents/state.json ledger.");
  }
}

main().catch((err) => {
  console.error("Syndication fatal error:", err);
  process.exit(1);
});
