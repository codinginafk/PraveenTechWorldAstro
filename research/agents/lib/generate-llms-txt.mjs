import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const LLMS_PATH = path.join(ROOT_DIR, "public/llms.txt");
const LLMS_FULL_PATH = path.join(ROOT_DIR, "public/llms-full.txt");
const ROBOTS_PATH = path.join(ROOT_DIR, "public/robots.txt");
const SITE_URL = "https://www.praveentechworld.com";

// Map any category to the correct pillarId
const CATEGORY_TO_PILLAR = {
  "website-setup": "website-setup",
  "windows-fixes": "windows-fixes",
  "hosting-infra": "hosting-infra",
  "ai-websites": "ai-websites",
  "ai-automation": "ai-automation",
  "it-operations": "it-operations",
  "build-in-public": "build-in-public",
  "ai-tools": "ai-websites",
  "privacy": "ai-websites",
  "security": "ai-websites",
  "automation": "ai-automation",
  "productivity": "ai-automation",
  "free-software": "website-setup",
  "career-growth": "website-setup",
  "android-fixes": "windows-fixes",
};

const PILLAR_LABELS = {
  "website-setup": "Website Setup & SEO",
  "windows-fixes": "Windows Troubleshooting",
  "hosting-infra": "Hosting & Infrastructure",
  "ai-websites": "AI Tools & Websites",
  "ai-automation": "AI Automation Scripts",
  "it-operations": "IT Operations & Infrastructure",
  "build-in-public": "Build in Public",
};

function parseFrontmatter(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf-8");
    content = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)/);
    if (!fmMatch) return null;
    const fmLines = fmMatch[1].split("\n");
    const body = fmMatch[2].trim();
    const fm = { slug: path.basename(filePath, ".mdx"), body };
    for (const line of fmLines) {
      const kv = line.match(/^(\w+):\s*(.+)/);
      if (!kv) continue;
      const key = kv[1], val = kv[2].trim();
      if (key === "title") fm.title = val.replace(/^"(.+)"$/, "$1");
      else if (key === "description") fm.description = val.replace(/^"(.+)"$/, "$1");
      else if (key === "category") fm.category = val.replace(/^"(.+)"$/, "$1");
      else if (key === "pillarId") fm.pillarId = val.replace(/^"(.+)"$/, "$1");
      else if (key === "tags") fm.tags = [];
      else if (key === "publishDate") fm.publishDate = val;
    }
    // Read tags from subsequent lines
    const tagSection = fmMatch[1].match(/tags:\n((?:\s+-\s+.+\n?)*)/);
    if (tagSection) {
      fm.tags = [...tagSection[1].matchAll(/-\s+"?(.+?)"?\s*$/gm)].map(m => m[1].trim());
    }
    return fm;
  } catch { return null; }
}

function markdownToPlainText(md) {
  return md
    .replace(/^---[\s\S]*?^---\n*/m, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/>\s?(.*)/g, "$1")
    .replace(/[-*]\s/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function generateLlmsTxt() {
  if (!fs.existsSync(ARTICLES_DIR)) {
    console.error("Articles directory not found:", ARTICLES_DIR);
    return;
  }

  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"));
  const articles = files.map(f => parseFrontmatter(path.join(ARTICLES_DIR, f))).filter(Boolean);

  // Sort by publishDate descending
  articles.sort((a, b) => (b.publishDate || "").localeCompare(a.publishDate || ""));

  // Group by pillar (pillarId preferred, with category fallback mapped via CATEGORY_TO_PILLAR)
  const byPillar = {};
  for (const a of articles) {
    const raw = a.pillarId || a.category || "uncategorized";
    const pillar = CATEGORY_TO_PILLAR[raw] || raw;
    if (!Object.keys(PILLAR_LABELS).includes(pillar)) continue;
    if (!byPillar[pillar]) byPillar[pillar] = [];
    byPillar[pillar].push(a);
  }

  // Generate llms.txt
  let out = `# PraveenTech World
> Practical IT Operations, AI automation, and technology guides. An IT Ops Lead documents how he uses DeepSeek and OpenCode to build real automation scripts.
> URL: ${SITE_URL}

This file helps AI systems discover our content. Articles are organized by topic pillar.

The site exposes the following WebMCP tools for agentic browsing:
- SearchArticles (form): Search published articles by keyword
- SendMessage (form): Submit a contact message
- AcceptCookies (imperative): Accept analytics cookies
- RejectCookies (imperative): Reject analytics cookies
- ToggleTheme (imperative): Switch between light/dark mode
- ToggleMobileMenu (imperative): Open/close the mobile navigation

## Navigation
- [Home](${SITE_URL}/)
- [All Articles](${SITE_URL}/blog)
- [Sitemap](${SITE_URL}/sitemap-index.xml)
- [RSS Feed](${SITE_URL}/rss.xml)

`;

  for (const [pillar, items] of Object.entries(byPillar)) {
    const label = PILLAR_LABELS[pillar] || pillar.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    out += `## ${label}\n\n`;
    for (const a of items) {
      const desc = (a.description || "").slice(0, 200);
      out += `- [${a.title || a.slug}](${SITE_URL}/blog/${a.slug}): ${desc}\n`;
    }
    out += "\n";
  }

  fs.writeFileSync(LLMS_PATH, out, "utf-8");
  console.log(`llms.txt written with ${articles.length} articles across ${Object.keys(byPillar).length} pillars`);
}

export function generateLlmsFullTxt() {
  if (!fs.existsSync(ARTICLES_DIR)) return;

  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"));
  const articles = files.map(f => {
    const content = fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8");
    const fm = parseFrontmatter(path.join(ARTICLES_DIR, f));
    const body = content.replace(/^---[\s\S]*?^---\n*/m, "").trim();
    return { ...fm, body };
  }).filter(Boolean);

  articles.sort((a, b) => (b.publishDate || "").localeCompare(a.publishDate || ""));

  let out = `# PraveenTech World — Full Content Index

> Practical IT Operations, AI automation, and technology guides.
> URL: ${SITE_URL}
> Language: English
> Last updated: ${new Date().toISOString().split("T")[0]}
> Total articles: ${articles.length}

This file contains the full text of every article on the site. AI systems can extract specific passages for citations or answers.

---

`;

  for (const a of articles) {
    const pillar = a.pillarId || a.category || "uncategorized";
    const cleanBody = markdownToPlainText(a.body);
    out += `## ${a.title || a.slug}\n\n`;
    out += `**Pillar:** ${PILLAR_LABELS[pillar] || pillar}\n`;
    out += `**URL:** ${SITE_URL}/blog/${a.slug}\n`;
    out += `**Published:** ${a.publishDate || "N/A"}\n\n`;
    if (a.description) out += `> ${a.description}\n\n`;
    out += `${cleanBody.slice(0, 5000)}\n\n---\n\n`;
  }

  fs.writeFileSync(LLMS_FULL_PATH, out, "utf-8");
  console.log(`llms-full.txt written with ${articles.length} full articles`);
}

export function updateRobotsTxt() {
  let robots = fs.readFileSync(ROBOTS_PATH, "utf-8");

  // Add llms.txt reference as a comment if not already present
  if (!robots.includes("llms.txt")) {
    robots += `\n# LLM content discovery file\n# AI crawlers: full article content available at /llms.txt and /llms-full.txt\n`;
    robots += `\n# Note: llms.txt is NOT a robots directive. Google and all crawlers continue to\n`;
    robots += `# have full Allow: / access. This file is a content discovery aid for AI systems.\n`;
    fs.writeFileSync(ROBOTS_PATH, robots, "utf-8");
    console.log("robots.txt updated with llms.txt reference");
  } else {
    console.log("robots.txt already references llms.txt");
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateLlmsTxt();
  generateLlmsFullTxt();
  updateRobotsTxt();
  console.log("\nDone.");
}
