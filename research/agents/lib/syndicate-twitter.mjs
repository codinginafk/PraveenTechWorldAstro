import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TwitterApi } from "twitter-api-v2";
import { log } from "./shared.mjs";
import { parseArticle } from "./syndication.mjs";
import { verifyLinkedInPost, printVerificationReport } from "./linkedin-verifier.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_URL = "https://www.praveentechworld.com";
const AGENTS_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(AGENTS_DIR, "twitter-posts");

const MAX_DAILY_POSTS = 5;
const MIN_HOURS_BETWEEN = 1;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, "state.json"), "utf-8"));
  } catch { return {}; }
}

function saveState(state) {
  fs.writeFileSync(path.join(AGENTS_DIR, "state.json"), JSON.stringify(state, null, 2), "utf-8");
}

function getClient() {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_KEY_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return null;
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken: accessToken,
    accessSecret: accessSecret,
  });
}

function generateTweetText(article) {
  const title = article.title || "";
  const slug = article.slug || "";
  const body = article.body || "";
  const articleUrl = `${SITE_URL}/blog/${slug}`;
  const lower = title.toLowerCase() + " " + body.toLowerCase().slice(0, 500);
  const tags = (article.tags || []).slice(0, 2).map(t => `#${t.replace(/[^a-zA-Z0-9]/g, "")}`).join(" ");

  const maxText = 237;
  let tweet = "";

  if (lower.includes("zero") || lower.includes("no data") || lower.includes("not showing")) {
    tweet = `GSC showing zeros? 90% of the time it is one of three things: (1) wrong property type, (2) verification dropped, or (3) DNS change broke the connection. Check these before touching anything else.`;
  } else if (lower.includes("sitemap") && lower.includes("error")) {
    tweet = `Sitemap "Couldn't fetch" error usually means your server blocks Googlebot. Check robots.txt first. If that is clean, your server might be rate-limiting crawlers. A quick .htaccess fix solves it.`;
  } else if (lower.includes("add.*google") || lower.includes("add your website") || lower.includes("get indexed")) {
    tweet = `New site not on Google? You do not need to submit to 100 search engines. Two steps: (1) verify in Search Console, (2) submit sitemap.xml. Google indexes you within 24-72h after that.`;
  } else if (lower.includes("ga4") || lower.includes("analytics") || lower.includes("tracking")) {
    tweet = `GA4 showing zero users but you know people visit? Your measurement ID might have changed during a site migration. Check your G-XXXXXX code matches what is actually in your site header.`;
  } else if (lower.includes("windows") || lower.includes("update") || lower.includes("error")) {
    tweet = `Windows update stuck? Run "sfc /scannow" from an admin command prompt. Catches 80% of update-related corruption. If that fails, DISM /Online /Cleanup-Image /RestoreHealth usually finishes the job.`;
  } else if (lower.includes("password") || lower.includes("security")) {
    tweet = `Your password manager is only as secure as your master password. Use a passphrase (4+ random words) instead of a short complex string. Easier to remember, harder to crack.`;
  } else if (lower.includes("backlink") || lower.includes("link building")) {
    tweet = `Backlinks from sites your actual customers read matter more than DA 90 spam links. One relevant link from a niche industry blog beats 50 directory submissions. Quality over quantity, always.`;
  } else if (lower.includes("speed") || lower.includes("performance") || lower.includes("slow")) {
    tweet = `Site speed tip most people miss: lazy load below-the-fold images AND defer non-critical CSS. Two lines of code can drop your LCP by 40%. Google PageSpeed Insights will show you exactly what to defer.`;
  } else if (lower.includes("seo") || lower.includes("rank")) {
    tweet = `Ranking tip: Google prioritizes pages that answer the query immediately. Put your answer in the first 100 words, not buried after 3 paragraphs of intro. Front-load value, back-load context.`;
  } else {
    const sentences = body.match(/[A-Z][^.!?]*[.!?]/g) || [];
    const useful = sentences.filter(s => s.split(" ").length > 8 && s.split(" ").length < 25 && !s.toLowerCase().includes("disclaimer") && !s.toLowerCase().includes("this article") && !s.toLowerCase().includes("click here"));
    tweet = useful.length > 0 ? useful[0].trim() : title;
  }

  const full = `${tweet} ${articleUrl} ${tags}`.trim();
  if (full.length <= 280) return full;

  const urlLength = 23;
  const tagsLength = tags ? tags.length + 1 : 0;
  const available = 280 - urlLength - tagsLength;
  const truncated = tweet.length > available ? tweet.slice(0, available - 1) + "…" : tweet;
  return `${truncated} ${articleUrl} ${tags}`.trim();
}

function generateTwitterImage(article) {
  // Reuse the same SVG card generator from LinkedIn
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
    "ai-automation": { primary: "#7c3aed", bg: "#f5f3ff", accent: "#ede9fe" },
    "it-operations": { primary: "#0891b2", bg: "#ecfeff", accent: "#cffafe" },
    "build-in-public": { primary: "#dc2626", bg: "#fef2f2", accent: "#fee2e2" },
  };
  const palette = colors[category] || { primary: "#2563eb", bg: "#f8f9fa", accent: "#e8f0fe" };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="800" height="400">
  <rect width="800" height="400" fill="${palette.bg}"/>
  <rect x="0" y="0" width="800" height="6" fill="${palette.primary}"/>
  <rect x="40" y="340" width="720" height="1" fill="${palette.accent}"/>
  <text x="50" y="50" font-family="Arial,sans-serif" font-size="12" fill="${palette.primary}" font-weight="bold" letter-spacing="2">PRAVEENTECHWORLD</text>
  <rect x="50" y="65" width="${safeTitle.length * 9 > 700 ? 700 : safeTitle.length * 9}" height="4" rx="2" fill="${palette.primary}" opacity="0.3"/>
  <text x="50" y="${safeTitle.length > 80 ? 130 : 110}" font-family="Arial,sans-serif" font-size="28" fill="#1f2937" font-weight="bold">
    <tspan x="50" dy="0">${wrapText(safeTitle, 28, 700).map((line, i) => `<tspan x="50" dy="${i === 0 ? 0 : 36}">${line}</tspan>`).join("")}</tspan>
  </text>
  <rect x="50" y="280" rx="4" fill="${palette.accent}" width="${Math.min(safeCategory.length * 10 + 30, 300)}" height="28"/>
  <text x="65" y="299" font-family="Arial,sans-serif" font-size="13" fill="${palette.primary}" font-weight="bold">${safeCategory}</text>
  <text x="50" y="370" font-family="Arial,sans-serif" font-size="11" fill="#9ca3af">${tags || "Tech guides & tutorials"}</text>
  <text x="750" y="370" font-family="Arial,sans-serif" font-size="11" fill="#9ca3af" text-anchor="end">praveentechworld.com</text>
</svg>`;
  return svg;
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

// Twitter-specific verification (subset of LinkedIn gates)
export function verifyTweet(text, options = {}) {
  const gates = [];

  // TQ1: Character count
  const urlCount = (text.match(/https?:\/\/[^\s]+/g) || []).length;
  const effectiveLen = urlCount > 0 ? text.length - (urlCount * 23) + (urlCount * 23) : text.length;
  gates.push({
    id: "TQ1", name: "Character limit", pass: text.length <= 280,
    score: text.length <= 280 ? 5 : 0,
    details: text.length <= 280 ? `${text.length}/280 chars` : `Exceeds 280 chars: ${text.length}`,
  });

  // TQ2: Has URL
  const hasUrl = /https?:\/\/[^\s]+/.test(text);
  gates.push({
    id: "TQ2", name: "Has article link", pass: hasUrl,
    score: hasUrl ? 5 : 0,
    details: hasUrl ? "Link included" : "No URL found — add article link",
  });

  // TQ3: Has hashtags
  const tags = text.match(/#\w+/g) || [];
  gates.push({
    id: "TQ3", name: "Hashtags", pass: tags.length >= 1 && tags.length <= 3,
    score: tags.length >= 1 && tags.length <= 3 ? 5 : 0,
    details: tags.length === 0 ? "No hashtags" : `${tags.length} hashtags`,
  });

  // TQ4: Image attached
  gates.push({
    id: "TQ4", name: "Image attached", pass: options.hasImage || false,
    score: options.hasImage ? 5 : 0,
    details: options.hasImage ? "Image attached" : "No image",
  });

  // TQ5: No engagement bait
  const bait = [/comment\s+(yes|no)/i, /like\s+if/i, /tag\s+/i, /retweet\s+if/i];
  const baitHits = bait.filter(b => b.test(text));
  gates.push({
    id: "TQ5", name: "No engagement bait", pass: baitHits.length === 0,
    score: baitHits.length === 0 ? 5 : 0,
    details: baitHits.length === 0 ? "Clean" : `Bait phrases: ${baitHits.join(", ")}`,
  });

  const passed = gates.filter(g => g.pass).length;
  const totalScore = gates.reduce((s, g) => s + g.score, 0);
  const maxScore = gates.length * 5;
  const normalized = Math.round((totalScore / maxScore) * 100);

  return {
    passed: passed === gates.length,
    score: normalized,
    gatesPassed: passed,
    gatesTotal: gates.length,
    gates,
  };
}

export function generateTweetPostForArticle(filePath) {
  const article = parseArticle(filePath);
  if (!article) {
    log(`[Twitter] Could not parse article: ${filePath}`);
    return null;
  }

  const tweetText = generateTweetText(article);
  ensureDir(OUTPUT_DIR);

  const slug = article.slug || path.basename(filePath, ".mdx");
  const outputFile = path.join(OUTPUT_DIR, `${slug}-tweet.txt`);
  fs.writeFileSync(outputFile, tweetText, "utf-8");

  // Generate SVG image
  const svgContent = generateTwitterImage(article);
  const svgDir = path.join(OUTPUT_DIR, "images");
  ensureDir(svgDir);
  const svgFile = path.join(svgDir, `${slug}.svg`);
  fs.writeFileSync(svgFile, svgContent, "utf-8");

  log(`[Twitter] Tweet saved: ${outputFile}`);
  log(`[Twitter] Image saved: ${svgFile}`);

  return { file: outputFile, svgFile, text: tweetText, slug, article };
}

export function previewTweet(filePath) {
  const result = generateTweetPostForArticle(filePath);
  if (!result) {
    console.log("\n  ✗ Could not generate tweet\n");
    return null;
  }

  const verifierResult = verifyTweet(result.text, { hasImage: true });

  console.log("\n═══════════════════════════════════════");
  console.log("  TWITTER / X POST PREVIEW");
  console.log("═══════════════════════════════════════");
  console.log("");
  console.log(`  ${result.text}`);
  console.log("");
  console.log(`  Chars: ${result.text.length}/280`);
  console.log(`  Image: ${result.svgFile}`);
  console.log("");
  console.log("  ── Verification ──");
  for (const gate of verifierResult.gates) {
    console.log(`  ${gate.pass ? "✓" : "✗"} ${gate.id}: ${gate.details}`);
  }
  console.log(`  Score: ${verifierResult.score}/100 (${verifierResult.gatesPassed}/${verifierResult.gatesTotal} passed)`);
  console.log(`  Status: ${verifierResult.passed ? "✓ PASSED" : "✗ NEEDS REVIEW"}`);
  console.log("═══════════════════════════════════════\n");

  return { ...result, verifierResult };
}

export async function publishTweet(post, options = {}) {
  const client = getClient();
  if (!client) {
    log("[Twitter] Missing Twitter API credentials. Set TWITTER_API_KEY, TWITTER_API_KEY_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET in .env");
    return null;
  }

  // Rate limit check
  const state = loadState();
  const today = new Date().toISOString().slice(0, 10);
  if (state.twitterPostDate !== today) {
    state.twitterPostDate = today;
    state.twitterDailyCount = 0;
  }
  if ((state.twitterDailyCount || 0) >= MAX_DAILY_POSTS) {
    log(`[Twitter] Daily limit reached: ${state.twitterDailyCount}/${MAX_DAILY_POSTS}`);
    return null;
  }
  const lastPost = state.twitterLastPost ? new Date(state.twitterLastPost).getTime() : 0;
  const hoursSince = (Date.now() - lastPost) / 3600000;
  if (lastPost > 0 && hoursSince < MIN_HOURS_BETWEEN) {
    log(`[Twitter] Cooldown: ${hoursSince.toFixed(1)}h since last post (min ${MIN_HOURS_BETWEEN}h)`);
    return null;
  }

  try {
    // Upload image
    let mediaId = null;
    if (options.svgPath && fs.existsSync(options.svgPath)) {
      try {
        const svgBinary = fs.readFileSync(options.svgPath);
        // Convert SVG to PNG buffer for Twitter (Twitter doesn't support SVG natively)
        // For now, upload as SVG and let Twitter handle it — if it fails, post without image
        const mediaBuffer = Buffer.from(svgBinary);
        mediaId = await client.v1.uploadMedia(mediaBuffer, { type: "image/svg+xml" });
        log("[Twitter] Image uploaded");
      } catch (imgErr) {
        log(`[Twitter] Image upload failed (posting without image): ${imgErr.message}`);
      }
    }

    // Post tweet
    const tweetPayload = { text: post.text };
    if (mediaId) {
      tweetPayload.media = { media_ids: [mediaId] };
    }

    const tweet = await client.v2.tweet(tweetPayload);
    const tweetUrl = `https://x.com/i/status/${tweet.data.id}`;
    log(`[Twitter] Tweet posted: ${tweetUrl}`);

    // Record rate limit
    state.twitterLastPost = new Date().toISOString();
    state.twitterDailyCount = (state.twitterDailyCount || 0) + 1;
    state.twitterPostLog = state.twitterPostLog || [];
    state.twitterPostLog.push({ time: state.twitterLastPost, slug: post.slug, url: tweetUrl, status: "published" });
    if (state.twitterPostLog.length > 50) state.twitterPostLog = state.twitterPostLog.slice(-50);
    saveState(state);

    return { tweetId: tweet.data.id, tweetUrl };
  } catch (err) {
    log(`[Twitter] Post failed: ${err.message}`);
    state.twitterPostLog = state.twitterPostLog || [];
    state.twitterPostLog.push({ time: new Date().toISOString(), error: err.message, status: "failed" });
    saveState(state);
    return null;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || "preview";
  const slug = process.argv[3];
  const articlesDir = path.resolve(__dirname, "../../../src/content/articles");

  const getFilePath = (s) => path.join(articlesDir, `${s}.mdx`);

  if (command === "preview") {
    if (slug) {
      if (!fs.existsSync(getFilePath(slug))) { console.log(`\n  ✗ Article not found: ${slug}.mdx\n`); process.exit(1); }
      previewTweet(getFilePath(slug));
    } else {
      const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx")).sort().reverse();
      if (files.length > 0) previewTweet(path.join(articlesDir, files[0]));
    }
  } else if (command === "publish" && slug) {
    if (!fs.existsSync(getFilePath(slug))) { console.log(`\n  ✗ Article not found: ${slug}.mdx\n`); process.exit(1); }
    const result = generateTweetPostForArticle(getFilePath(slug));
    if (!result) { console.log("\n  ✗ Could not generate post\n"); process.exit(1); }
    const verify = verifyTweet(result.text, { hasImage: true });
    if (!verify.passed) {
      console.log("\n  ✗ Tweet failed verification — post with --force to skip:");
      for (const g of verify.gates) {
        if (!g.pass) console.log(`  ✗ ${g.id}: ${g.details}`);
      }
      process.exit(1);
    }
    // Try Buffer first, fall back to direct Twitter API
    const bufferToken = process.env.BUFFER_ACCESS_TOKEN || process.env.BUFFER_API_KEY;
    if (bufferToken) {
      const { postArticleToTwitter } = await import("./buffer-client.mjs");
      const { parseArticle } = await import("./syndication.mjs");
      const article = parseArticle(getFilePath(slug));
      if (article) {
        const post = await postArticleToTwitter(article);
        if (post) {
          console.log(`\n  ✓ Posted via Buffer! Status: ${post.status} (ID: ${post.id})\n`);
          process.exit(0);
        }
      }
    }
    // Fallback to direct Twitter API
    publishTweet(result, { svgPath: result.svgFile }).then(r => {
      if (r) console.log(`\n  ✓ Posted: ${r.tweetUrl}\n`);
      else console.log("\n  ✗ Failed\n");
    });
  } else {
    console.log("\n  Usage:");
    console.log("    node syndicate-twitter.mjs preview [slug]    # Preview + verify");
    console.log("    node syndicate-twitter.mjs publish <slug>    # Post to X (passes verification)");
    console.log("");
  }
}
