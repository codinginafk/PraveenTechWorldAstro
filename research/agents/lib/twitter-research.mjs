import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log } from "./shared.mjs";
import { TwitterApi } from "twitter-api-v2";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AGENTS_DIR = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(AGENTS_DIR, "reports");

function getClient() {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_KEY_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null;
  return new TwitterApi({ appKey: apiKey, appSecret: apiSecret, accessToken, accessSecret });
}

const PILLAR_KEYWORDS = {
  "website-setup": ["google search console", "ga4", "sitemap", "seo", "website not indexed", "google analytics"],
  "windows-fixes": ["windows 11", "windows update", "blue screen", "pc slow", "windows error", "microsoft"],
  "hosting-infra": ["web hosting", "vercel", "cloudflare", "domain", "dns", "ssl certificate", "server"],
  "ai-websites": ["chatgpt website", "ai content", "ai seo", "copilot", "gemini", "ai writing"],
};

const WOEID_WORLD = 1;
const WOEID_US = 23424977;
const WOEID_UK = 23424975;

function getWoeid(region) {
  const map = { world: 1, us: 23424977, uk: 23424975, india: 23424848, canada: 23424775, australia: 23424748 };
  return map[region.toLowerCase()] || 1;
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, "state.json"), "utf-8"));
  } catch { return {}; }
}

function saveState(state) {
  fs.writeFileSync(path.join(AGENTS_DIR, "state.json"), JSON.stringify(state, null, 2), "utf-8");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeReport(filename, content) {
  ensureDir(REPORTS_DIR);
  const filePath = path.join(REPORTS_DIR, filename);
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`  Report saved: ${filePath}`);
}

export async function getTrendingTopics(region = "world") {
  const client = getClient();
  if (!client) {
    console.log("\n  ✗ Twitter API credentials not configured\n");
    return [];
  }
  console.log(`\n  Trending discussions in tech (${region}):\n`);
  const queries = [
    `google OR seo OR "search console" OR sitemap -is:retweet`,
    `windows OR microsoft OR "windows 11" OR pc -is:retweet`,
    `hosting OR domain OR website OR dns OR cloudflare -is:retweet`,
    `ai OR chatgpt OR gemini OR copilot OR llm -is:retweet`,
  ];
  try {
    for (const q of queries) {
      const result = await client.v2.tweetCountRecent(q, { granularity: "day" });
      const count = result.data?.[0]?.tweet_count || 0;
      const label = q.split(" OR ")[0].replace(/-is:retweet/g, "").trim();
      console.log(`  ${label}: ${count.toLocaleString()} tweets today`);
    }
    console.log(`\n  (Full trends need Paid API — Basic $100/mo)`);
    return [];
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return [];
  }
}

export async function searchNicheContent(pillar, count = 10) {
  const client = getClient();
  if (!client) return [];
  const keywords = PILLAR_KEYWORDS[pillar] || [];
  if (keywords.length === 0) {
    console.log(`  No keywords defined for pillar: ${pillar}`);
    return [];
  }
  const query = keywords.map(k => `"${k}"`).join(" OR ");
  console.log(`  Searching: ${query}\n`);
  try {
    const result = await client.v2.search({
      query: `${query} -is:retweet lang:en`,
      max_results: count,
      "tweet.fields": ["public_metrics", "created_at", "author_id"],
      expansions: ["author_id"],
      "user.fields": ["name", "username", "public_metrics"],
    });
    const users = {};
    if (result.includes?.users) {
      for (const u of result.includes.users) {
        users[u.id] = u;
      }
    }
    console.log(`  Recent tweets about "${pillar}":\n`);
    for (const tweet of result.data || []) {
      const author = users[tweet.author_id] || {};
      const metrics = tweet.public_metrics || {};
      const engagement = metrics.like_count + metrics.retweet_count + metrics.reply_count;
      const time = new Date(tweet.created_at).toLocaleDateString();
      console.log(`  [${metrics.like_count}👍 ${metrics.retweet_count}🔄] @${author.username || "?"} (${time})`);
      console.log(`  ${tweet.text.replace(/\n/g, " ").slice(0, 200)}`);
      console.log(`  Engagement: ${engagement} total\n`);
    }
    return result.data || [];
  } catch (err) {
    console.log(`  Error searching: ${err.message}`);
    return [];
  }
}

export async function searchQuestions(pillar, count = 10) {
  const client = getClient();
  if (!client) return [];
  const keywords = PILLAR_KEYWORDS[pillar] || [];
  const query = keywords.map(k => `"${k}"`).join(" OR ");
  try {
    const result = await client.v2.search({
      query: `(${query}) (how OR why OR what OR fix OR error OR help OR issue OR problem OR not OR can't OR won't) -is:retweet lang:en`,
      max_results: count,
      "tweet.fields": ["public_metrics", "created_at"],
    });
    console.log(`\n  Questions people are asking about "${pillar}":\n`);
    for (const tweet of result.data || []) {
      console.log(`  • ${tweet.text.replace(/\n/g, " ").slice(0, 250)}`);
      console.log(`    [${tweet.public_metrics?.like_count || 0} likes]\n`);
    }
    return result.data || [];
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return [];
  }
}

export async function analyzeInfluencers(pillar) {
  const client = getClient();
  if (!client) return [];
  const keywords = PILLAR_KEYWORDS[pillar] || [];
  const query = keywords.map(k => `"${k}"`).join(" OR ");
  try {
    const result = await client.v2.search({
      query: `${query} -is:retweet lang:en`,
      max_results: 100,
      "tweet.fields": ["public_metrics"],
      expansions: ["author_id"],
      "user.fields": ["name", "username", "public_metrics", "description"],
    });
    const authorStats = {};
    for (const tweet of result.data || []) {
      const aid = tweet.author_id;
      if (!authorStats[aid]) authorStats[aid] = { tweets: 0, totalEngagement: 0 };
      authorStats[aid].tweets++;
      authorStats[aid].totalEngagement += (tweet.public_metrics?.like_count || 0) + (tweet.public_metrics?.retweet_count || 0);
    }
    const users = {};
    if (result.includes?.users) {
      for (const u of result.includes.users) {
        users[u.id] = u;
      }
    }
    const ranked = Object.entries(authorStats)
      .map(([id, stats]) => ({ user: users[id], ...stats }))
      .filter(a => a.user?.public_metrics?.followers_count > 100 && a.totalEngagement > 10)
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 10);
    console.log(`\n  Top accounts posting about "${pillar}":\n`);
    for (const a of ranked) {
      const u = a.user;
      console.log(`  @${u.username} — ${u.name}`);
      console.log(`  Followers: ${u.public_metrics?.followers_count?.toLocaleString() || "?"}`);
      console.log(`  Engagement on topic: ${a.totalEngagement} across ${a.tweets} tweets`);
      console.log(`  Bio: ${(u.description || "").slice(0, 150)}`);
      console.log(`  https://x.com/${u.username}\n`);
    }
    let report = `# Twitter Influencer Analysis: ${pillar}\n\n`;
    report += `**Date:** ${new Date().toISOString()}\n\n`;
    report += "| Rank | Account | Followers | Engagement | Bio |\n|---|---|---|---|---|\n";
    let i = 1;
    for (const a of ranked) {
      const u = a.user;
      report += `| ${i++} | @${u.username} | ${u.public_metrics?.followers_count?.toLocaleString() || "?"} | ${a.totalEngagement} | ${(u.description || "").slice(0, 100)} |\n`;
    }
    writeReport(`twitter-influencers-${pillar}.md`, report);
    return ranked;
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return [];
  }
}

export async function getTrendingArticles(pillar, count = 5) {
  const client = getClient();
  if (!client) return [];
  const keywords = PILLAR_KEYWORDS[pillar] || [];
  const query = keywords.map(k => `"${k}"`).join(" OR ");
  try {
    const result = await client.v2.search({
      query: `(${query}) (blog OR guide OR tutorial OR "how to" OR fix OR tip) -is:retweet lang:en has:links`,
      max_results: count * 3,
      "tweet.fields": ["public_metrics"],
      expansions: ["author_id"],
      "user.fields": ["username"],
    });
    const users = {};
    if (result.includes?.users) for (const u of result.includes.users) users[u.id] = u;
    const withUrl = (result.data || []).filter(t => t.text.match(/https?:\/\/[^\s]+/)).slice(0, count);
    console.log(`\n  Shared articles about "${pillar}":\n`);
    for (const tweet of withUrl) {
      const url = tweet.text.match(/https?:\/\/[^\s]+/)?.[0] || "";
      const author = users[tweet.author_id];
      console.log(`  • ${tweet.text.replace(/\n/g, " ").slice(0, 150)}`);
      console.log(`    By @${author?.username || "?"} — ${url.slice(0, 80)}`);
      console.log(`    Likes: ${tweet.public_metrics?.like_count || 0}\n`);
    }
    return withUrl;
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return [];
  }
}

export async function fullAnalysis(pillar) {
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  TWITTER RESEARCH: ${pillar}`);
  console.log(`═══════════════════════════════════════`);
  await getTrendingTopics();
  console.log(``);
  await searchNicheContent(pillar, 10);
  console.log(``);
  await searchQuestions(pillar, 8);
  console.log(``);
  await analyzeInfluencers(pillar);
  console.log(``);
  await getTrendingArticles(pillar, 5);
  console.log(`\n  Done. Reports saved to research/agents/reports/\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || "help";
  const arg = process.argv[3] || "website-setup";

  if (command === "trends") {
    getTrendingTopics(arg);
  } else if (command === "search") {
    searchNicheContent(arg);
  } else if (command === "questions") {
    searchQuestions(arg);
  } else if (command === "influencers") {
    analyzeInfluencers(arg);
  } else if (command === "articles") {
    getTrendingArticles(arg);
  } else if (command === "analyze") {
    fullAnalysis(arg);
  } else {
    console.log("\n  Usage:");
    console.log("    node twitter-research.mjs trends [region]       # Trending topics worldwide");
    console.log("    node twitter-research.mjs search [pillar]       # Search niche content");
    console.log("    node twitter-research.mjs questions [pillar]    # Find user questions/problems");
    console.log("    node twitter-research.mjs influencers [pillar]  # Find top accounts in niche");
    console.log("    node twitter-research.mjs articles [pillar]     # Find shared articles");
    console.log("    node twitter-research.mjs analyze [pillar]      # Full analysis");
    console.log("");
    console.log("  Pillars: website-setup, windows-fixes, hosting-infra, ai-websites");
    console.log("  Regions: world, us, uk, india, canada, australia\n");
  }
}
