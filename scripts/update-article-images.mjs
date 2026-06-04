import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { searchImage, extractKeywords } from "../research/agents/lib/imagesearch.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(__filename, "../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");

function parseFrontmatter(mdx) {
  const match = mdx.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const raw = match[1];
  const fm = {};
  const lines = raw.split("\n");
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
  if (value === null || value === undefined) {
    // Remove the field line if it exists
    const regex = new RegExp(`^${field}: .*$`, "m");
    return mdx.replace(regex, "");
  }
  const escaped = value.replace(/"/g, "'");
  const line = `${field}: "${escaped}"`;
  const regex = new RegExp(`^${field}: .*$`, "m");
  if (regex.test(mdx)) {
    return mdx.replace(regex, line);
  }
  // Add after description or the last existing field before publishDate
  return mdx.replace(/^description: .*$/m, (m) => `${m}\n${line}`);
}

async function main() {
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"));
  console.log(`Found ${files.length} articles to process.\n`);

  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(ARTICLES_DIR, file);
    const mdx = fs.readFileSync(filePath, "utf-8");
    const fm = parseFrontmatter(mdx);
    if (!fm) {
      console.log(`  SKIP ${file}: could not parse frontmatter`);
      skipped++;
      continue;
    }

    const title = fm.title || "";
    const tags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
    const category = fm.category || "";

    console.log(`\n[${file}]`);
    console.log(`  Title: ${title.slice(0, 60)}...`);
    console.log(`  Tags: ${tags.join(", ")}`);

    const slug = file.replace(/\.mdx$/, "");
    const keywords = extractKeywords(title, tags, category);
    console.log(`  Keywords: ${keywords.slice(0, 4).join(", ")}...`);

    const imgResult = await searchImage(keywords, slug, title, ROOT_DIR);

    let newMdx = mdx;

    if (imgResult?.url) {
      newMdx = replaceFrontmatterField(newMdx, "coverImage", imgResult.url);
      newMdx = replaceFrontmatterField(newMdx, "imageAlt", (imgResult.alt || title).slice(0, 120));
      newMdx = replaceFrontmatterField(newMdx, "imageCredit", imgResult.credit || null);
    } else {
      // Keep existing coverImage, remove imageCredit if present
      newMdx = replaceFrontmatterField(newMdx, "imageCredit", null);
    }

    if (newMdx !== mdx) {
      fs.writeFileSync(filePath, newMdx, "utf-8");
      console.log(`  UPDATED: coverImage=${imgResult?.url?.slice(0, 60) || "(kept)"} credit="${imgResult?.credit || ""}"`);
      updated++;
    } else {
      console.log(`  SKIP (no change needed)`);
      skipped++;
    }
  }

  console.log(`\n--- Done: ${updated} updated, ${skipped} skipped ---`);
}

main().catch(err => { console.error(err); process.exit(1); });
