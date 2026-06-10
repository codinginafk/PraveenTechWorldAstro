import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "./shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AGENTS_DIR = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(AGENTS_DIR, "buffer-reports");

const ENDPOINT = "https://api.buffer.com/graphql";

async function gql(query) {
  const token = process.env.BUFFER_ACCESS_TOKEN || process.env.BUFFER_API_KEY;
  if (!token) throw new Error("BUFFER_ACCESS_TOKEN or BUFFER_API_KEY not set");
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await r.json();
  if (data.errors) {
    const msgs = data.errors.map(e => e.message).join("; ");
    throw new Error(`Buffer API: ${msgs}`);
  }
  return data;
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, "state.json"), "utf-8"));
  } catch { return {}; }
}

function saveState(state) {
  fs.writeFileSync(path.join(AGENTS_DIR, "state.json"), JSON.stringify(state, null, 2), "utf-8");
}

function wrapText(text, fontSize, maxWidth) {
  const avgCharWidth = fontSize * 0.6;
  const maxChars = Math.floor(maxWidth / avgCharWidth);
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (current ? current + " " : "") + word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function getAccount() {
  const data = await gql(`{ account { id email } }`);
  return data.data?.account || null;
}

export async function getChannels() {
  const data = await gql(`{
    account {
      organizations {
        id
        name
        channels {
          id
          name
          service
          type
        }
      }
    }
  }`);
  const orgs = data.data?.account?.organizations || [];
  return orgs.flatMap(o => o.channels.map(c => ({ ...c, organizationId: o.id, organizationName: o.name })));
}

export async function createPost(opts = {}) {
  const {
    channelId = "6a2969198f1d11f9b2705f85",
    text = "",
    imageUrl = null,
    schedulingType = "automatic",
    mode = "shareNow",
  } = opts;

  let assets = "";
  if (imageUrl) {
    assets = `, assets: [{ image: { url: "${imageUrl}", metadata: { altText: "Article cover" } } }]`;
  }

  const data = await gql(`mutation {
    createPost(input: {
      channelId: "${channelId}",
      text: ${JSON.stringify(text)},
      schedulingType: ${schedulingType},
      mode: ${mode}${assets}
    }) {
      ... on PostActionSuccess { post { id status text shareMode channel { id name service } } }
      ... on UnexpectedError { message }
      ... on InvalidInputError { message }
      ... on LimitReachedError { message }
    }
  }`);
  return data.data?.createPost?.post || null;
}

export async function getPosts(channelId = "6a2969198f1d11f9b2705f85", limit = 10) {
  const orgs = await gql(`{ account { organizations { id } } }`);
  const orgId = orgs.data?.account?.organizations?.[0]?.id;
  if (!orgId) throw new Error("No organization found");

  const data = await gql(`{
    posts(input: { organizationId: "${orgId}", filter: { channelIds: ["${channelId}"] } }, first: ${limit}) {
      edges {
        node {
          id
          text
          status
          shareMode
          dueAt
          sentAt
          createdAt
          channelService
          assets { id type mimeType }
        }
      }
    }
  }`);
  return data.data?.posts?.edges?.map(e => e.node) || [];
}

// Tweet text generation (same as syndicate-twitter)
function generateTweetText(article) {
  const siteUrl = "https://www.praveentechworld.com";
  const socialHook = article.socialHook || "";
  const title = article.title || "";
  const slug = article.slug || "";
  const articleUrl = `${siteUrl}/blog/${slug}`;
  const tags = (article.tags || []).slice(0, 2).map(t => `#${t.replace(/[^a-zA-Z0-9]/g, "")}`).join(" ");

  if (socialHook) {
    const text = `${socialHook} ${articleUrl} ${tags}`.trim();
    if (text.length <= 280) return text;
    const maxHookLen = 280 - articleUrl.length - tags.length - 3;
    const truncated = socialHook.length > maxHookLen ? socialHook.slice(0, maxHookLen - 1) + "…" : socialHook;
    return `${truncated} ${articleUrl} ${tags}`.trim();
  }

  const text = `${title} ${articleUrl} ${tags}`.trim();
  if (text.length <= 280) return text;
  const maxTitleLen = 280 - articleUrl.length - tags.length - 3;
  const truncated = title.length > maxTitleLen ? title.slice(0, maxTitleLen - 1) + "…" : title;
  return `${truncated} ${articleUrl} ${tags}`.trim();
}

function generateCardImage(article) {
  const title = article.title || "PraveenTechWorld";
  const category = article.category || "tech";
  const tags = (article.tags || []).slice(0, 3).join(" · ");
  const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const safeCategory = category.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const colors = {
    "website-setup": { primary: "#2563eb", bg: "#eff6ff", accent: "#dbeafe" },
    "windows-fixes": { primary: "#7c3aed", bg: "#f5f3ff", accent: "#ede9fe" },
    "hosting-infra": { primary: "#059669", bg: "#ecfdf5", accent: "#d1fae5" },
    "ai-websites": { primary: "#d97706", bg: "#fffbeb", accent: "#fef3c7" },
  };
  const palette = colors[category] || { primary: "#2563eb", bg: "#f8f9fa", accent: "#e8f0fe" };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="800" height="400">
  <rect width="800" height="400" fill="${palette.bg}"/>
  <rect x="0" y="0" width="800" height="6" fill="${palette.primary}"/>
  <rect x="40" y="340" width="720" height="1" fill="${palette.accent}"/>
  <text x="50" y="50" font-family="Arial,sans-serif" font-size="12" fill="${palette.primary}" font-weight="bold" letter-spacing="2">PRAVEENTECHWORLD</text>
  <rect x="50" y="65" width="${Math.min(safeTitle.length * 9, 700)}" height="4" rx="2" fill="${palette.primary}" opacity="0.3"/>
  <text x="50" y="${safeTitle.length > 80 ? 130 : 110}" font-family="Arial,sans-serif" font-size="28" fill="#1f2937" font-weight="bold">
    ${wrapText(safeTitle, 28, 700).map((line, i) => `<tspan x="50" dy="${i === 0 ? 0 : 36}">${line}</tspan>`).join("")}
  </text>
  <rect x="50" y="280" rx="4" fill="${palette.accent}" width="${Math.min(safeCategory.length * 10 + 30, 300)}" height="28"/>
  <text x="65" y="299" font-family="Arial,sans-serif" font-size="13" fill="${palette.primary}" font-weight="bold">${safeCategory}</text>
  <text x="50" y="370" font-family="Arial,sans-serif" font-size="11" fill="#9ca3af">${tags || "Tech guides & tutorials"}</text>
  <text x="750" y="370" font-family="Arial,sans-serif" font-size="11" fill="#9ca3af" text-anchor="end">praveentechworld.com</text>
</svg>`;
}

export async function postArticleToTwitter(article) {
  const text = generateTweetText(article);
  const svgContent = generateCardImage(article);

  // Save locally
  const outputDir = path.join(AGENTS_DIR, "buffer-posts");
  const slug = article.slug || "post";
  const imgDir = path.join(outputDir, "images");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, `${slug}-tweet.txt`), text, "utf-8");
  fs.writeFileSync(path.join(imgDir, `${slug}.svg`), svgContent, "utf-8");

  // Save SVG publicly for Buffer to fetch
  const svgPublicFull = path.resolve(__dirname, "../../../public/images/generated", `${slug}-buffer.svg`);
  fs.writeFileSync(svgPublicFull, svgContent, "utf-8");
  const publicUrl = `https://www.praveentechworld.com/images/generated/${slug}-buffer.svg`;

  // Rate limit
  const state = loadState();
  const today = new Date().toISOString().slice(0, 10);
  if (state.bufferPostDate !== today) {
    state.bufferPostDate = today;
    state.bufferDailyCount = 0;
  }
  if ((state.bufferDailyCount || 0) >= 10) {
    log(`[Buffer] Daily limit reached: ${state.bufferDailyCount}/10`);
    return null;
  }

  // Try with image first, fall back to text-only
  let post = null;
  try {
    post = await createPost({ text, imageUrl: publicUrl });
  } catch (e) {
    log(`[Buffer] Image post failed (${e.message}), trying text-only`);
  }

  if (!post) {
    try {
      post = await createPost({ text });
    } catch (e) {
      log(`[Buffer] Text-only post also failed: ${e.message}`);
      return null;
    }
  }

  if (post) {
    state.bufferLastPost = new Date().toISOString();
    state.bufferDailyCount = (state.bufferDailyCount || 0) + 1;
    state.bufferPostLog = state.bufferPostLog || [];
    state.bufferPostLog.push({ time: state.bufferLastPost, slug, id: post.id, status: post.status });
    if (state.bufferPostLog.length > 50) state.bufferPostLog = state.bufferPostLog.slice(-50);
    saveState(state);

    log(`[Buffer] Posted to Twitter via Buffer: "${text.slice(0, 50)}..." (post ${post.id}, status: ${post.status})`);
    return post;
  }
  return null;
}

export async function getRecentPosts(limit = 5) {
  const posts = await getPosts("6a2969198f1d11f9b2705f85", limit);
  console.log(`\n  Recent Buffer posts (Twitter/X - @praveenwithapen):\n`);
  for (const p of posts) {
    const time = p.sentAt || p.createdAt;
    const date = time ? new Date(time).toLocaleDateString() : "?";
    console.log(`  [${p.status}] ${date}: ${(p.text || "").slice(0, 80)}`);
    if (p.assets?.length > 0) console.log(`    Image: ${p.assets[0].image || "yes"}`);
    console.log("");
  }
  return posts;
}

// Research via Buffer isn't available — Buffer is a publishing tool
// Use direct Twitter v2 API for read-only research (free tier works for reads)
export async function searchRecentTweets(query, count = 10) {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_KEY_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    log("[Buffer] Twitter credentials not available for research");
    return [];
  }

  // Use OAuth 1.0a for Twitter API v2 search
  const { TwitterApi } = await import("twitter-api-v2");
  const client = new TwitterApi({ appKey: apiKey, appSecret: apiSecret, accessToken, accessSecret });

  try {
    const result = await client.v2.search({
      query: `${query} -is:retweet lang:en`,
      max_results: count,
      "tweet.fields": ["public_metrics", "created_at", "author_id"],
      expansions: ["author_id"],
      "user.fields": ["name", "username", "public_metrics"],
    });

    const users = {};
    if (result.includes?.users) for (const u of result.includes.users) users[u.id] = u;

    const out = [];
    for (const tweet of result.data || []) {
      const author = users[tweet.author_id] || {};
      const metrics = tweet.public_metrics || {};
      out.push({
        text: tweet.text,
        author: `@${author.username || "?"}`,
        authorName: author.name || "?",
        followers: author.public_metrics?.followers_count || 0,
        likes: metrics.like_count || 0,
        retweets: metrics.retweet_count || 0,
        replies: metrics.reply_count || 0,
        createdAt: tweet.created_at,
        engagement: metrics.like_count + metrics.retweet_count + metrics.reply_count,
      });
    }
    return out;
  } catch (err) {
    log(`[Buffer] Twitter search error: ${err.message}`);
    return [];
  }
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || "help";
  const arg = process.argv[3];

  if (command === "account") {
    getAccount().then(a => {
      if (a) console.log(`\n  Buffer Account:\n  ID: ${a.id}\n  Email: ${a.email}\n`);
      else console.log("\n  ✗ Not authenticated\n");
    });
  } else if (command === "channels") {
    getChannels().then(chans => {
      console.log(`\n  Buffer Channels:\n`);
      for (const c of chans) {
        console.log(`  ${c.service} (${c.type}): ${c.name} — ID: ${c.id}`);
        console.log(`  Org: ${c.organizationName}\n`);
      }
    });
  } else if (command === "post" && arg) {
    const articlesDir = path.resolve(__dirname, "../../../src/content/articles");
    const filePath = path.join(articlesDir, `${arg}.mdx`);
    if (!fs.existsSync(filePath)) { console.log(`\n  ✗ Article not found: ${arg}.mdx\n`); process.exit(1); }
    const { parseArticle } = await import("./syndication.mjs");
    const article = parseArticle(filePath);
    if (!article) { console.log("\n  ✗ Could not parse article\n"); process.exit(1); }
    postArticleToTwitter(article).then(r => {
      if (r) console.log(`\n  ✓ Posted via Buffer! Status: ${r.status}\n`);
      else console.log("\n  ✗ Failed\n");
    });
  } else if (command === "recent") {
    getRecentPosts(parseInt(arg) || 5);
  } else if (command === "search" && arg) {
    searchRecentTweets(arg).then(tweets => {
      console.log(`\n  Twitter search results for "${arg}":\n`);
      for (const t of tweets.slice(0, 5)) {
        console.log(`  [${t.likes}👍 ${t.retweets}🔄] ${t.author} (${t.followers} followers)`);
        console.log(`  ${t.text.slice(0, 200)}\n`);
      }
    });
  } else {
    console.log("\n  Buffer Syndication Client");
    console.log("  ─────────────────────────");
    console.log("  node buffer-client.mjs account        # Account info");
    console.log("  node buffer-client.mjs channels       # List connected channels");
    console.log("  node buffer-client.mjs post <slug>    # Post article to Twitter via Buffer");
    console.log("  node buffer-client.mjs recent [n]     # Show recent posts");
    console.log("  node buffer-client.mjs search <query> # Search Twitter (read-only)\n");
  }
}
