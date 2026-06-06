import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "./shared.mjs";
import { parseArticle } from "./syndication.mjs";

const SITE_URL = "https://www.praveentechworld.com";
const AGENTS_DIR = path.resolve(import.meta.dirname, "..");
const OUTPUT_DIR = path.join(AGENTS_DIR, "medium-posts");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function formatForMedium(article) {
  const lines = [];
  lines.push(`# ${article.title}`);
  lines.push("");
  lines.push(`> \u{1F4DD} This article is explained in detail on [praveentechworld.com](${SITE_URL}/blog/${article.slug}). For in-depth reading, follow the link.`);
  lines.push("");
  lines.push("---");
  lines.push("");

  const body = article.body || "";
  const cleanBody = body
    .replace(/^---[\s\S]*?---\n*/m, "")
    .replace(/^## /gm, "## ")
    .trim();

  lines.push(cleanBody);
  lines.push("");
  lines.push("---");
  lines.push("");

  if (article.tags && article.tags.length) {
    const tags = article.tags.map((t) => t.trim()).join(", ");
    lines.push(`*Tags: ${tags}*`);
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("### How to post this to Medium");
  lines.push("");

  lines.push("**\u26A0\uFE0F CRITICAL: Set the canonical URL before publishing**");
  lines.push("");
  lines.push("1. Go to https://medium.com/new-story");
  lines.push("2. Paste the content below into the editor");
  lines.push("3. **Click the three-dot menu (\u2022\u2022\u2022) \u2192 'More settings'**");
  lines.push("4. **In the 'Canonical URL' field, paste:**");
  lines.push(`   \`${SITE_URL}/blog/${article.slug}\``);
  lines.push("5. Add a cover image (use the one from the original article)");
  lines.push("6. Publish");
  lines.push("");
  lines.push("> **DO NOT** check 'Originally published on Medium' — that option is only for content that was first published on Medium. Our original is on praveentechworld.com.");
  lines.push("");
  lines.push("---");
  lines.push("");

  return lines.join("\n");
}

export function generateMediumPostForArticle(filePath) {
  const article = parseArticle(filePath);
  if (!article) {
    log(`[Medium] Could not parse article: ${filePath}`);
    return null;
  }

  const post = formatForMedium(article);
  ensureDir(OUTPUT_DIR);

  const slug = article.slug || path.basename(filePath, ".mdx");
  const outputFile = path.join(OUTPUT_DIR, `${slug}-medium.md`);
  fs.writeFileSync(outputFile, post, "utf-8");

  log(`[Medium] Post generated: ${outputFile}`);
  log(`[Medium] Open and paste at: https://medium.com/new-story`);
  log(`[Medium] IMPORTANT: Set canonical URL to ${SITE_URL}/blog/${slug} in Medium's settings (three-dot menu -> More settings -> Canonical URL).`);

  return { file: outputFile, post };
}

export function generateMediumPostForLatest() {
  const articlesDir = path.resolve(import.meta.dirname, "../../src/content/articles");
  if (!fs.existsSync(articlesDir)) {
    log("[Medium] Articles directory not found");
    return null;
  }

  const files = fs.readdirSync(articlesDir)
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .reverse()
    .slice(0, 1);

  if (files.length === 0) {
    log("[Medium] No articles found");
    return null;
  }

  return generateMediumPostForArticle(path.join(articlesDir, files[0]));
}

export async function runMediumSyndication() {
  log("[Medium] Generating Medium posts for unsyndicated articles...");
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
    const result = generateMediumPostForArticle(filePath);
    if (result) results.push(result);
  }

  log(`[Medium] Generated ${results.length} Medium post(s)`);
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMediumSyndication().catch(console.error);
}
