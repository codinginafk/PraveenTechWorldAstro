import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");

// Highly indicative AI words in titles/headings
const STRICT_AI_WORDS = [
  "delve", "tapestry", "demystify", "crucial", "pivotal", "testament", "fostering", "landscape"
];

// Highly formulaic section headings
const STRICT_FORMULAIC = [
  "introduction", "conclusion", "final thoughts", "wrapping up", "the bottom line"
];

function splitArticle(content) {
  const parts = content.split("---");
  const frontmatter = parts[1] || "";
  const body = parts.slice(2).join("---") || "";
  return { frontmatter, body };
}

function parseFrontmatter(fmString) {
  const data = {};
  const lines = fmString.split("\n");
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx !== -1) {
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  }
  return data;
}

function extractHeadings(body) {
  const headings = [];
  const lines = body.split("\n");
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,4})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: line
      });
    }
  }
  return headings;
}

const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"));
const results = [];

for (const file of files) {
  const filePath = path.join(ARTICLES_DIR, file);
  const content = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = splitArticle(content);
  const fmData = parseFrontmatter(frontmatter);
  const headings = extractHeadings(body);

  const flags = [];

  // Check frontmatter title & seoTitle
  const tLower = (fmData.title || "").toLowerCase();
  const sLower = (fmData.seoTitle || "").toLowerCase();

  for (const w of STRICT_AI_WORDS) {
    if (tLower.includes(w)) flags.push(`title buzzword: "${w}"`);
    if (sLower.includes(w)) flags.push(`seoTitle buzzword: "${w}"`);
  }

  if (fmData.title && (fmData.title.includes("—") || fmData.title.includes("–"))) {
    flags.push("title has em/en dash");
  }
  if (fmData.seoTitle && (fmData.seoTitle.includes("—") || fmData.seoTitle.includes("–"))) {
    flags.push("seoTitle has em/en dash");
  }

  // Check headings
  for (const h of headings) {
    const hLower = h.text.toLowerCase();
    
    // Check formulaic
    for (const f of STRICT_FORMULAIC) {
      if (hLower === f || hLower.startsWith(f + ":") || hLower.startsWith(f + " ")) {
        flags.push(`heading formulaic: "${h.text}"`);
      }
    }

    // Check buzzwords
    for (const w of STRICT_AI_WORDS) {
      if (hLower.includes(w)) {
        flags.push(`heading buzzword: "${h.text}" ("${w}")`);
      }
    }

    // Check dashes
    if (h.text.includes("—") || h.text.includes("–")) {
      flags.push(`heading has em/en dash: "${h.text}"`);
    }
  }

  if (flags.length > 0) {
    results.push({ file, title: fmData.title, flags });
  }
}

console.log(JSON.stringify(results, null, 2));
