import fs from "fs";
import path from "path";
import { SEO_CONFIG, DIST_DIR, isExcluded } from "./config.mjs";

function extractMeta(html, urlPath) {
  const findings = [];

  // Title tag
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";
  if (!title) {
    findings.push({ type: "missing_title", severity: "CRITICAL", page: urlPath, message: "Page is missing <title> tag" });
  } else {
    if (title.length < SEO_CONFIG.titleMin) {
      findings.push({ type: "title_too_short", severity: "HIGH", page: urlPath, message: `Title too short (${title.length} chars, min ${SEO_CONFIG.titleMin}): "${title}"` });
    }
    if (title.length > SEO_CONFIG.titleMax) {
      findings.push({ type: "title_too_long", severity: "HIGH", page: urlPath, message: `Title too long (${title.length} chars, max ${SEO_CONFIG.titleMax}): "${title.slice(0, 80)}..."` });
    }
    if (/^[a-z]/.test(title)) {
      findings.push({ type: "title_case", severity: "LOW", page: urlPath, message: `Title should start with capital letter: "${title.slice(0, 60)}"` });
    }
  }

  // Meta description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const desc = descMatch ? descMatch[1].trim() : "";
  if (!desc) {
    findings.push({ type: "missing_description", severity: "HIGH", page: urlPath, message: "Page is missing meta description" });
  } else {
    if (desc.length < SEO_CONFIG.descMin) {
      findings.push({ type: "desc_too_short", severity: "MEDIUM", page: urlPath, message: `Meta description too short (${desc.length} chars, min ${SEO_CONFIG.descMin})` });
    }
    if (desc.length > SEO_CONFIG.descMax) {
      findings.push({ type: "desc_too_long", severity: "MEDIUM", page: urlPath, message: `Meta description too long (${desc.length} chars, max ${SEO_CONFIG.descMax})` });
    }
  }

  // Duplicate title/description detection (will check across pages later)
  return findings;
}

function extractHeadings(html, urlPath) {
  const findings = [];
  const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  const h1s = [];
  let m;
  while ((m = h1Regex.exec(html)) !== null) {
    h1s.push(m[1].replace(/<[^>]+>/g, "").trim());
  }

  if (h1s.length === 0) {
    findings.push({ type: "missing_h1", severity: "HIGH", page: urlPath, message: "Page has no H1 heading" });
  } else if (h1s.length > 1) {
    findings.push({ type: "multiple_h1", severity: "HIGH", page: urlPath, message: `Page has ${h1s.length} H1 tags (should have exactly 1)` });
  }

  // Check heading hierarchy
  const hTags = [];
  const allHeadings = html.match(/<h([1-6])[^>]*>[\s\S]*?<\/h\1>/gi) || [];
  for (const h of allHeadings) {
    const level = parseInt(h.match(/<h([1-6])/i)[1]);
    const text = h.replace(/<[^>]+>/g, "").trim();
    if (text) hTags.push({ level, text });
  }

  let prevLevel = 0;
  for (const h of hTags) {
    if (h.level > prevLevel + 1) {
      findings.push({ type: "heading_skip", severity: "MEDIUM", page: urlPath, message: `Heading level skipped from H${prevLevel} to H${h.level}: "${h.text.slice(0, 50)}"` });
    }
    prevLevel = h.level;
  }

  return findings;
}

function extractOgTags(html, urlPath) {
  const findings = [];
  const ogTags = {};
  const ogRegex = /<meta\s+property=["'](og:[^"']+)["']\s+content=["']([^"']*)["']/gi;
  let m;
  while ((m = ogRegex.exec(html)) !== null) {
    ogTags[m[1]] = m[2];
  }

  const required = ["og:title", "og:description", "og:url", "og:type"];
  for (const tag of required) {
    if (!ogTags[tag]) {
      findings.push({ type: "missing_og_tag", severity: "MEDIUM", page: urlPath, message: `Missing Open Graph tag: ${tag}` });
    }
  }

  // Twitter card
  const twitterMatch = html.match(/<meta\s+name=["']twitter:card["']\s+content=["']([^"']*)["']/i);
  if (!twitterMatch) {
    findings.push({ type: "missing_twitter_card", severity: "LOW", page: urlPath, message: "Missing Twitter card meta tag" });
  }

  // Canonical
  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
  if (!canonicalMatch) {
    findings.push({ type: "missing_canonical", severity: "MEDIUM", page: urlPath, message: "Missing canonical link tag" });
  } else {
    const canonicalUrl = canonicalMatch[1];
    const expectedCanonical = `${SEO_CONFIG.siteUrl}${urlPath}`;
    if (canonicalUrl !== expectedCanonical && canonicalUrl !== expectedCanonical + "/" && canonicalUrl + "/" !== expectedCanonical) {
      findings.push({ type: "canonical_mismatch", severity: "HIGH", page: urlPath, message: `Canonical URL mismatch: "${canonicalUrl}" vs expected "${expectedCanonical}"` });
    }
  }

  // Robots meta
  const robotsMatch = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i);
  if (robotsMatch) {
    const content = robotsMatch[1];
    if (content.includes("noindex")) {
      findings.push({ type: "noindex_detected", severity: "INFO", page: urlPath, message: `Page has noindex directive: "${content}"` });
    }
  }

  return findings;
}

export function auditPage(html, urlPath) {
  const findings = [];
  findings.push(...extractMeta(html, urlPath));
  findings.push(...extractHeadings(html, urlPath));
  findings.push(...extractOgTags(html, urlPath));
  return findings;
}

export async function runPageAudit() {
  const findings = [];
  const titleMap = {};
  const descMap = {};

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".html") && !e.name.startsWith("sitemap")) {
        const html = fs.readFileSync(full, "utf-8");
        let urlPath = full
          .replace(DIST_DIR, "")
          .replace(/\\/g, "/")
          .replace(/\/index\.html$/, "")
          .replace(/\.html$/, "");
        if (urlPath === "") urlPath = "/";

        if (isExcluded(urlPath)) continue;
        if (full.includes("_astro") || full.includes("pagefind")) continue;

        const pageFindings = auditPage(html, urlPath);
        findings.push(...pageFindings);

        // Track for duplicate detection
        const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
        if (titleMatch) {
          const t = titleMatch[1].trim().toLowerCase();
          if (!titleMap[t]) titleMap[t] = [];
          titleMap[t].push(urlPath);
        }
        const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
        if (descMatch) {
          const d = descMatch[1].trim().toLowerCase();
          if (!descMap[d]) descMap[d] = [];
          descMap[d].push(urlPath);
        }
      }
    }
  }

  walk(DIST_DIR);

  // Duplicate titles
  for (const [t, pages] of Object.entries(titleMap)) {
    if (pages.length > 1) {
      findings.push({ type: "duplicate_title", severity: "HIGH", page: pages[0], message: `Duplicate title "${t.slice(0, 60)}..." across ${pages.length} pages: ${pages.join(", ")}` });
    }
  }

  // Duplicate descriptions
  for (const [d, pages] of Object.entries(descMap)) {
    if (pages.length > 1) {
      findings.push({ type: "duplicate_description", severity: "MEDIUM", page: pages[0], message: `Duplicate meta description across ${pages.length} pages: ${pages.join(", ")}` });
    }
  }

  return findings;
}
