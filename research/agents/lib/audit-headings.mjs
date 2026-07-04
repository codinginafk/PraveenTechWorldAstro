import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");

// Common AI buzzwords in titles/headings
const AI_BUZZWORDS = [
  "delve", "tapestry", "demystify", "unlock", "master", "elevate", 
  "crucial", "pivotal", "ultimate", "comprehensive", "complete guide",
  "foster", "testament", "underscore", "navigating", "landscape"
];

// Common formulaic headers
const FORMULAIC_HEADERS = [
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
      // Remove surrounding quotes if any
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

function analyzeTitle(title) {
  if (!title) return { score: 0, flags: [] };
  const flags = [];
  const lower = title.toLowerCase();
  
  // Check for buzzwords
  for (const word of AI_BUZZWORDS) {
    if (lower.includes(word)) {
      flags.push(`buzzword: "${word}"`);
    }
  }
  
  // Check for formulaic elements / colons
  if ((title.match(/:/g) || []).length >= 1) {
    flags.push("has colon structure");
  }
  
  // Check for em/en dashes
  if (title.includes("—") || title.includes("–")) {
    flags.push("has em/en dash");
  }

  return {
    score: flags.length,
    flags
  };
}

// Main execution
const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"));
const auditResults = [];

for (const file of files) {
  const filePath = path.join(ARTICLES_DIR, file);
  const content = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = splitArticle(content);
  const fmData = parseFrontmatter(frontmatter);
  const headings = extractHeadings(body);

  const titleAnalysis = analyzeTitle(fmData.title);
  const seoTitleAnalysis = analyzeTitle(fmData.seoTitle);
  
  const headingFlags = [];
  for (const h of headings) {
    const lowerText = h.text.toLowerCase();
    
    // Check formulaic headers
    for (const fh of FORMULAIC_HEADERS) {
      if (lowerText === fh || lowerText.startsWith(fh + ":")) {
        headingFlags.push({ text: h.text, type: `formulaic: "${fh}"` });
      }
    }
    
    // Check buzzwords in heading
    for (const word of AI_BUZZWORDS) {
      if (lowerText.includes(word)) {
        headingFlags.push({ text: h.text, type: `buzzword: "${word}"` });
      }
    }
    
    // Check for em/en dashes in heading
    if (h.text.includes("—") || h.text.includes("–")) {
      headingFlags.push({ text: h.text, type: "has em/en dash" });
    }
  }

  const totalFlags = titleAnalysis.flags.length + seoTitleAnalysis.flags.length + headingFlags.length;
  if (totalFlags > 0) {
    auditResults.push({
      file,
      title: fmData.title,
      seoTitle: fmData.seoTitle,
      titleFlags: titleAnalysis.flags,
      seoTitleFlags: seoTitleAnalysis.flags,
      headingFlags
    });
  }
}

// Print results in markdown format
console.log(`# AI Title/Heading Audit Report\n`);
console.log(`Found ${auditResults.length} articles with potential AI indicators in titles/headings.\n`);

for (const res of auditResults) {
  console.log(`### 📂 [${res.file}](file://${path.join(ARTICLES_DIR, res.file).replace(/\\/g, "/")})`);
  if (res.titleFlags.length > 0) {
    console.log(`- **Title:** "${res.title}" [Flags: ${res.titleFlags.join(", ")}]`);
  }
  if (res.seoTitleFlags.length > 0) {
    console.log(`- **SEO Title:** "${res.seoTitle}" [Flags: ${res.seoTitleFlags.join(", ")}]`);
  }
  if (res.headingFlags.length > 0) {
    console.log(`- **Headings:**`);
    for (const hf of res.headingFlags) {
      console.log(`  - "${hf.text}" [Flag: ${hf.type}]`);
    }
  }
  console.log("");
}
