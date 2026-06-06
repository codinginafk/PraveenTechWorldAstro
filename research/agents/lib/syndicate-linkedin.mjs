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
  return headings.slice(0, 4).map(h => {
    const text = h.replace(/^##?\s+/, "").trim();
    return text;
  });
}

function generateLinkedInPost(article) {
  const articleUrl = `${SITE_URL}/blog/${article.slug}`;
  const lines = [];

  lines.push("---");
  lines.push(`Ready to publish: ${article.title}`);
  lines.push(`URL (for first comment): ${articleUrl}`);
  lines.push(`Scheduled: ${new Date().toISOString().split("T")[0]}`);
  lines.push("---");
  lines.push("");

  // Hook — personal, engaging, 2-3 sentences
  const hook = generateHook(article);
  lines.push(hook);
  lines.push("");

  // Value/opinion paragraph
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

  // Engagement CTA
  lines.push("What has been your experience with this? Drop a comment below.");
  lines.push("");

  // Link instruction (not the actual URL — that goes in first comment)
  lines.push("Link in first comment for the full deep dive.");
  lines.push("");

  // Separator
  lines.push("---");
  lines.push("");

  // Hashtags (3-5 max)
  const hashtags = (article.tags || []).map((t) => {
    const clean = t.replace(/[^a-zA-Z0-9]/g, "");
    return `#${clean}`;
  }).join(" ");
  lines.push(hashtags || "#SEO #GoogleRanking #DigitalMarketing");

  lines.push("");
  lines.push("---");
  lines.push(`\u2139\ufe0f Auto-generated. Edit before posting.`);
  lines.push("");

  // First comment section
  lines.push("=".repeat(50));
  lines.push("FIRST COMMENT (copy and paste as first comment on your post):");
  lines.push("=".repeat(50));
  lines.push(articleUrl);

  return lines.join("\n");
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
  fs.writeFileSync(outputFile, post, "utf-8");

  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${SITE_URL}/blog/${slug}`)}`;
  log(`[LinkedIn] Post generated: ${outputFile}`);
  log(`[LinkedIn] Share link: ${shareUrl}`);
  log(`[LinkedIn] IMPORTANT: Copy the URL from the FIRST COMMENT section and paste it as the first comment on your post. Do NOT put the link in the post body.`);

  return { file: outputFile, shareUrl, post };
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
  log("[LinkedIn] Generating LinkedIn posts for unsyndicated articles...");
  const statePath = path.join(AGENTS_DIR, "state.json");
  let syndicated = [];
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    syndicated = state.syndicated || [];
  } catch { }

  const articlesDir = path.resolve(import.meta.dirname, "../../src/content/articles");
  if (!fs.existsSync(articlesDir)) return [];

  const files = fs.readdirSync(articlesDir)
    .filter((f) => f.endsWith(".mdx"))
    .filter((f) => !syndicated.includes(f));

  const results = [];
  for (const file of files.slice(0, 3)) {
    const filePath = path.join(articlesDir, file);
    const result = generateLinkedInPostForArticle(filePath);
    if (result) results.push(result);
  }

  log(`[LinkedIn] Generated ${results.length} LinkedIn post(s)`);
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLinkedInSyndication().catch(console.error);
}
