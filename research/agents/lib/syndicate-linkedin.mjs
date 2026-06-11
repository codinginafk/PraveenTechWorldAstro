import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "./shared.mjs";
import { parseArticle } from "./syndication.mjs";
import { verifyLinkedInPost, printVerificationReport } from "./linkedin-verifier.mjs";
import {
  checkLinkedInRateLimit, recordLinkedInPost, recordLinkedInFailure,
  addJitter, getRateLimitStatus, withRetry
} from "./linkedin-rate-limit.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_URL = "https://www.praveentechworld.com";
const AGENTS_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(AGENTS_DIR, "linkedin-posts");
const ASSETS_DIR = path.resolve(__dirname, "../../..");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
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

function generateLinkedInPostText(article) {
  const articleUrl = `${SITE_URL}/blog/${article.slug}`;
  const socialHook = article.socialHook || "";
  const title = article.title || "";
  const desc = article.description || "";
  const insights = extractInsights(article.body || "");
  const tags = (article.tags || []).filter(t => t);
  const categoryTag = article.category ? [`#${article.category.replace(/[^a-zA-Z0-9]/g, "")}`] : [];
  const hashtagLimit = tags.slice(0, 4).map(t => {
    const clean = t.replace(/[^a-zA-Z0-9]/g, "");
    return `#${clean}`;
  });
  const allTags = [...categoryTag, ...hashtagLimit].slice(0, 5).join(" ") || "#TechTips";

  // Build a strong hook from the socialHook or title
  const hookLine = socialHook || `Your ${title.toLowerCase().replace(/\?.*$/, "")}? Here is exactly how to fix it.`;

  // Extract body paragraphs for a meatier post
  const body = article.body || "";
  const paragraphs = body.split("\n\n").filter(p => {
    const t = p.trim();
    return t && !t.startsWith("#") && !t.startsWith("---") && !t.startsWith("!") && t.split(/\s+/).length > 15;
  });

  // Pick 2-3 substantive paragraphs from the body (skip intro/faq)
  const bodyPicks = paragraphs.filter(p => {
    const lower = p.toLowerCase();
    return !lower.startsWith("you open") && !lower.startsWith("i have") && !lower.startsWith("google") && !lower.startsWith("faq") && !lower.startsWith("related");
  }).slice(0, 3);

  const lines = [];
  lines.push(hookLine);
  lines.push("");
  lines.push(`I dealt with this on a client site last week. The fix was simpler than I expected once I checked the right things.`);
  lines.push("");

  // Add insight bullets
  if (insights.length > 0) {
    for (const insight of insights.slice(0, 3)) {
      lines.push(`\u2022 ${insight}`);
    }
    lines.push("");
  }

  // Add a substantive paragraph from the article body
  if (bodyPicks.length > 0) {
    const pick = bodyPicks[0].replace(/<[^>]+>/g, "").trim();
    const truncated = pick.length > 400 ? pick.slice(0, 397) + "..." : pick;
    lines.push(truncated);
    lines.push("");
  }

  lines.push(`The full guide covers everything from the simplest fix to advanced debugging. Drop a comment if you hit a tracking issue I did not cover here.`);
  lines.push("");
  lines.push(allTags);
  return { text: lines.join("\n"), url: articleUrl, title: article.title, slug: article.slug };
}

function generateLinkedInImage(article) {
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

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer;
}

async function uploadImageToLinkedIn(accessToken, personUrn, imageBuffer) {
  const author = `urn:li:person:${personUrn}`;

  // Convert SVG to PNG (LinkedIn doesn't accept SVG)
  let pngBuffer;
  try {
    const sharp = (await import("sharp")).default;
    pngBuffer = await sharp(imageBuffer).resize(1200, 630).png().toBuffer();
    log("[LinkedIn API] SVG converted to PNG");
  } catch (convErr) {
    log(`[LinkedIn API] PNG conversion failed, trying raw: ${convErr.message}`);
    pngBuffer = imageBuffer;
  }

  // Step 1: Register the image upload
  log("[LinkedIn API] Registering image upload...");
  const registerRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": "202511",
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      initializeUploadRequest: { owner: author },
    }),
  });

  if (!registerRes.ok) {
    const err = await registerRes.text();
    throw new Error(`Image register failed: ${registerRes.status} ${err}`);
  }

  const registerData = await registerRes.json();
  const uploadUrl = registerData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  const imageUrn = registerData.value?.image;

  if (!uploadUrl || !imageUrn) {
    throw new Error("Image registration response missing uploadUrl or image URN");
  }

  // Step 2: Upload the PNG binary
  log("[LinkedIn API] Uploading PNG image binary...");
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "image/png",
    },
    body: pngBuffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Image upload failed: ${uploadRes.status} ${err}`);
  }

  log("[LinkedIn API] Image uploaded successfully");
  return imageUrn;
}

export function generateLinkedInPostForArticle(filePath, options = {}) {
  const article = parseArticle(filePath);
  if (!article) {
    log(`[LinkedIn] Could not parse article: ${filePath}`);
    return null;
  }

  const post = generateLinkedInPostText(article);
  ensureDir(OUTPUT_DIR);

  const slug = article.slug || path.basename(filePath, ".mdx");
  const outputFile = path.join(OUTPUT_DIR, `${slug}-linkedin.txt`);
  const content = `${post.text}\n\n---\nURL (post as first comment): ${post.url}`;
  fs.writeFileSync(outputFile, content, "utf-8");

  // Generate SVG image
  const svgContent = generateLinkedInImage(article);
  const svgDir = path.join(OUTPUT_DIR, "images");
  ensureDir(svgDir);
  const svgFile = path.join(svgDir, `${slug}.svg`);
  fs.writeFileSync(svgFile, svgContent, "utf-8");

  log(`[LinkedIn] Post text saved: ${outputFile}`);
  log(`[LinkedIn] Post image saved: ${svgFile}`);

  return { file: outputFile, svgFile, text: post.text, url: post.url, title: post.title, slug, article };
}

export function previewLinkedInPost(filePath) {
  const result = generateLinkedInPostForArticle(filePath);
  if (!result) {
    console.log("\n  ✗ Could not generate LinkedIn post\n");
    return null;
  }

  const verifierResult = verifyLinkedInPost(result.text, { hasImage: true });

  console.log("\n═══════════════════════════════════════");
  console.log("  LINKEDIN POST PREVIEW");
  console.log("═══════════════════════════════════════");
  console.log("");
  console.log("  ┌─ Post Text ──────────────────────┐");
  for (const line of result.text.split("\n")) {
    console.log(`  │ ${line.padEnd(65)}│`);
  }
  console.log("  └────────────────────────────────────┘");
  console.log("");
  console.log(`  Image: ${result.svgFile}`);
  console.log(`  Article URL (in comments): ${result.url}`);
  console.log("");

  console.log(printVerificationReport(verifierResult));
  console.log("");

  return { ...result, verifierResult };
}

export async function publishToLinkedIn(post, options = {}) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!accessToken || !personUrn) {
    log("[LinkedIn API] Missing LINKEDIN_ACCESS_TOKEN or LINKEDIN_PERSON_URN. Set them in .env");
    return null;
  }

  const author = `urn:li:person:${personUrn}`;

  // Check rate limit before attempting to post
  const rateCheck = checkLinkedInRateLimit();
  if (!rateCheck.allowed) {
    log(`[LinkedIn] RATE LIMIT BLOCKED: ${rateCheck.reason}`);
    return null;
  }

  // Upload image if SVG path is provided (with retry)
  let mediaUrn = null;
  if (options.svgPath && fs.existsSync(options.svgPath)) {
    try {
      const svgBuffer = fs.readFileSync(options.svgPath);
      mediaUrn = await withRetry(() => uploadImageToLinkedIn(accessToken, personUrn, svgBuffer));
      log("[LinkedIn API] Image attached to post");
    } catch (imgErr) {
      log(`[LinkedIn API] Image upload failed (posting without image): ${imgErr.message}`);
    }
  }

  // Create the post with retry
  try {
    log("[LinkedIn API] Creating post...");
    const body = {
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
    };

    if (mediaUrn) {
      body.content = {
        media: {
          id: mediaUrn,
          title: post.title || "PraveenTechWorld",
        },
      };
      body.content.media.description = "PraveenTechWorld guide";
    } else {
      body.content = {
        article: {
          source: post.url,
          title: post.title || "PraveenTechWorld",
          description: "Practical tech guides and tutorials.",
        },
      };
    }

    const postRes = await withRetry(async () => {
      const res = await fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "LinkedIn-Version": "202511",
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      // Log every API response for monitoring
      const responseText = await res.text().catch(() => "");
      log(`[LinkedIn API] Response: HTTP ${res.status} ${responseText.slice(0, 200)}`);

      if (!res.ok) {
        const err = new Error(`${res.status}: ${responseText.slice(0, 200)}`);
        err.status = res.status;
        throw err;
      }
      return { res, text: responseText };
    });

    const activityUrn = postRes.res.headers.get("x-restli-id");
    const postUrl = `https://www.linkedin.com/feed/update/${activityUrn}`;
    log(`[LinkedIn API] Post created: ${postUrl}`);

    // Record successful post in rate limit tracker
    const state = rateCheck.state;
    recordLinkedInPost({ slug: post.slug, postUrl }, state);

    return { postUrn: activityUrn, postUrl };
  } catch (err) {
    log(`[LinkedIn API] Post failed: ${err.message}`);
    recordLinkedInFailure(err, rateCheck.state);
    return null;
  }
}

async function runPreview(slug) {
  const articlesDir = path.resolve(__dirname, "../../../src/content/articles");
  const filePath = path.join(articlesDir, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    console.log(`\n  ✗ Article not found: ${slug}.mdx\n`);
    return;
  }
  previewLinkedInPost(filePath);
}

async function runPublish(slug) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!accessToken) {
    console.log("\n  ✗ LINKEDIN_ACCESS_TOKEN not set in .env\n");
    return;
  }

  const articlesDir = path.resolve(__dirname, "../../../src/content/articles");
  const filePath = path.join(articlesDir, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    console.log(`\n  ✗ Article not found: ${slug}.mdx\n`);
    return;
  }

  const result = generateLinkedInPostForArticle(filePath);
  if (!result) {
    console.log("\n  ✗ Could not generate post\n");
    return;
  }

  const publishResult = await publishToLinkedIn(result, { svgPath: result.svgFile });
  if (publishResult) {
    console.log(`\n  ✓ Published: ${publishResult.postUrl}\n`);
  } else {
    console.log("\n  ✗ Publishing failed\n");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || "preview";
  const slug = process.argv[3];

  if (command === "preview") {
    if (slug) {
      runPreview(slug);
    } else {
      // Preview the latest article
      const articlesDir = path.resolve(__dirname, "../../../src/content/articles");
      if (fs.existsSync(articlesDir)) {
        const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx")).sort().reverse();
        if (files.length > 0) {
          const filePath = path.join(articlesDir, files[0]);
          const previewResult = previewLinkedInPost(filePath);
          if (previewResult) {
            console.log(`  Run: node research/agents/lib/syndicate-linkedin.mjs publish ${previewResult.slug}`);
          }
        }
      }
    }
  } else if (command === "schedule" && slug) {
    const baseMinutes = parseInt(process.argv[4] || "60", 10);
    const jittered = addJitter(baseMinutes);
    const publishTime = new Date(Date.now() + jittered * 60000);
    const jitterDiff = jittered - baseMinutes;
    console.log(`\n  Post scheduled: ${publishTime.toLocaleString()}`);
    console.log(`  Base: ${baseMinutes}min | Jitter: ${jitterDiff > 0 ? "+" : ""}${jitterDiff}min | Actual: ${jittered}min`);
    const status = getRateLimitStatus();
    console.log(`  Daily usage: ${status.dailyCount}/${status.maxDaily} | Remaining today: ${status.remainingToday}`);
    console.log("");
    setTimeout(async () => {
      console.log(`\n  Publishing now...`);
      await runPublish(slug);
    }, jittered * 60000);
  } else if (command === "publish" && slug) {
    const status = getRateLimitStatus();
    console.log(`\n  Daily usage: ${status.dailyCount}/${status.maxDaily} | Remaining today: ${status.remainingToday}`);
    console.log(`  Last post: ${status.lastPost || "never"}\n`);
    runPublish(slug);
  } else if (command === "status") {
    const status = getRateLimitStatus();
    console.log("\n═══════════════════════════════════════");
    console.log("  LinkedIn Rate Limit Status");
    console.log("═══════════════════════════════════════");
    console.log(`  Daily:    ${status.dailyCount}/${status.maxDaily} posts used`);
    console.log(`  Remaining: ${status.remainingToday} posts today`);
    console.log(`  Last post: ${status.lastPost || "never"}`);
    console.log(`  Min gap:   3h between posts`);
    console.log("═══════════════════════════════════════\n");
  } else {
    console.log("\n  Usage:");
    console.log("    node syndicate-linkedin.mjs status                          # Show rate limit status");
    console.log("    node syndicate-linkedin.mjs preview [slug]                  # Generate + verify + show preview");
    console.log("    node syndicate-linkedin.mjs publish <slug>                  # Post now (checks rate limits)");
    console.log("    node syndicate-linkedin.mjs schedule <slug> [minutes=60]    # Schedule with jitter");
    console.log("");
  }
}
