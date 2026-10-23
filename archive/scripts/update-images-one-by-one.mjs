import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { searchImage, extractKeywords } from "../research/agents/lib/imagesearch.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(__filename, "../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");

function normalizeEOL(mdx) {
  return mdx.replace(/\r\n/g, "\n");
}

function parseFrontmatter(mdx) {
  mdx = normalizeEOL(mdx);
  const match = mdx.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  const lines = match[1].split("\n");
  let currentKey = null;
  for (const line of lines) {
    if (/^\s+-\s/.test(line) && currentKey) {
      if (!fm[currentKey]) fm[currentKey] = [];
      fm[currentKey].push(line.replace(/^\s+-\s+/, "").replace(/^"(.*)"$/, "$1").trim());
      continue;
    }
    const kv = line.match(/^(\w+):\s*(.*)/);
    if (kv) {
      currentKey = kv[1];
      fm[currentKey] = kv[2].replace(/^"(.*)"$/, "$1").trim();
    }
  }
  return fm;
}

function replaceFrontmatterField(mdx, field, value) {
  mdx = normalizeEOL(mdx);
  if (value === null || value === undefined) {
    const regex = new RegExp(`^${field}: .*(?:\n(?:[ \t].*))*`, "m");
    return mdx.replace(regex, "").replace(/\n{2,}/g, "\n");
  }
  const escaped = value.replace(/"/g, "'");
  const line = `${field}: "${escaped}"`;
  const regex = new RegExp(`^${field}: .*(?:\n(?:[ \t].*))*`, "m");
  if (regex.test(mdx)) {
    return mdx.replace(regex, line);
  }
  return mdx.replace(/^description: .*$/m, (m) => `${m}\n${line}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function processArticle(file) {
  const filePath = path.join(ARTICLES_DIR, file);
  const mdxRaw = fs.readFileSync(filePath, "utf-8");
  const mdx = normalizeEOL(mdxRaw);
  const fm = parseFrontmatter(mdx);
  if (!fm) {
    console.log(`  SKIP: could not parse frontmatter`);
    return false;
  }

  const title = fm.title || "";
  const tags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
  const category = fm.category || "";
  const slug = file.replace(/\.mdx$/, "");
  const keywords = extractKeywords(title, tags, category);

  console.log(`  Keywords: ${keywords.slice(0, 3).join(", ")}...`);

  const imgResult = await searchImage(keywords, slug, title, ROOT_DIR);

  if (!imgResult?.url) {
    console.log(`  FAILED: no image found`);
    return false;
  }

  const source = imgResult.url.includes("unsplash") ? "UNSPLASH" :
                 imgResult.url.includes("wikimedia") ? "COMMONS" :
                 imgResult.url.includes("flickr") ? "OPENVERSE" : "SVG";
  console.log(`  Source: ${source}`);

  let newMdx = mdx;
  newMdx = replaceFrontmatterField(newMdx, "coverImage", imgResult.url);
  newMdx = replaceFrontmatterField(newMdx, "imageAlt", (imgResult.alt || title).slice(0, 120));
  newMdx = replaceFrontmatterField(newMdx, "imageCredit", imgResult.credit || "");

  if (newMdx !== mdx) {
    fs.writeFileSync(filePath, newMdx, "utf-8");
    console.log(`  UPDATED ✓`);
    return true;
  } else {
    console.log(`  SKIP (no change)`);
    return false;
  }
}

async function main() {
  const files = [
    "android-phone-not-charging-10-fixes-for-2026-complete-troubleshooting-guide.mdx",
    "how-to-fix-windows-11-update-errors-in-2026-complete-troubleshooting-guide.mdx",
    "chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows.mdx",
    "google-analytics-for-beginners-how-to-track-your-website-traffic.mdx",
    "how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide.mdx",
    "how-to-build-a-website-from-scratch-in-2026-a-complete-beginner-guide.mdx",
    "how-to-use-google-analytics-4-to-improve-your-content-strategy.mdx",
    "what-is-domain-authority-and-how-to-improve-it-in-2026.mdx",
    "automate-your-daily-workflow-in-2026-free-tools-and-real-examples.mdx",
  ];

  console.log(`Processing ${files.length} articles one by one...\n`);
  let updated = 0, skipped = 0;

  for (const file of files) {
    console.log(`\n[${file}]`);
    const ok = await processArticle(file);
    if (ok) updated++; else skipped++;
    if (files.indexOf(file) < files.length - 1) {
      console.log(`  Waiting 5s...`);
      await sleep(5000);
    }
  }

  console.log(`\n--- Done: ${updated} updated, ${skipped} skipped ---`);
}

main().catch(err => { console.error(err); process.exit(1); });
