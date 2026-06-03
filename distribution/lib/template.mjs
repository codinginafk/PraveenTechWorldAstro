import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const ARTICLES_DIR = join(ROOT, "src/content/articles");
const DRAFTS_DIR = join(ROOT, "research/reports/drafts");

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const raw = match[1];
  const body = match[2].trim();
  const fm = {};
  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (key === "tags") {
      val = raw.split("\n").filter((l) => l.trim().startsWith("- ")).map((l) => l.trim().slice(2));
      continue;
    }
    fm[key] = val;
  }
  return { frontmatter: fm, body };
}

function listFiles(dir, filter) {
  try { return readdirSync(dir).filter(filter).map((f) => join(dir, f)); }
  catch { return []; }
}

export function findArticle(slug) {
  const slugLower = slug.toLowerCase();
  const candidates = [
    ...listFiles(ARTICLES_DIR, (f) => (f.endsWith(".mdx") || f.endsWith(".md")) && f.toLowerCase().includes(slugLower)),
    ...listFiles(DRAFTS_DIR, (f) => (f.endsWith(".mdx") || f.endsWith(".md")) && f.toLowerCase().includes(slugLower) && !f.includes("outline")),
  ];
  for (const fp of candidates) {
    try {
      const text = readFileSync(fp, "utf-8");
      const parsed = parseFrontmatter(text);
      if (parsed) return { ...parsed, filename: fp };
    } catch { /* try next */ }
  }
  return null;
}

export function extractSections(body) {
  const sections = [];
  const headingRegex = /^## (.+)$/gm;
  let match;
  while ((match = headingRegex.exec(body)) !== null) {
    const heading = match[1];
    const start = match.index + match[0].length;
    const nextMatch = headingRegex.exec(body);
    const end = nextMatch ? nextMatch.index : body.length;
    headingRegex.lastIndex = end;
    sections.push({ heading, content: body.slice(start, end).trim() });
  }
  return sections;
}

export function pickSocialHook(frontmatter) {
  return frontmatter.socialHook || frontmatter.description || frontmatter.title;
}

export function truncate(text, maxLen) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).replace(/\s+\S*$/, "") + "…";
}

export function writeOutput(platform, filename, content) {
  const dir = join(ROOT, "distribution/output", platform);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const fp = join(dir, filename);
  writeFileSync(fp, content, "utf-8");
  console.log(`  Wrote: ${fp}`);
  return fp;
}
