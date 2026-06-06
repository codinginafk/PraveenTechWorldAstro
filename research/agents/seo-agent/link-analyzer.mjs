import fs from "fs";
import path from "path";
import { SEO_CONFIG, DIST_DIR, isExcluded } from "./config.mjs";

const SITE_URL = SEO_CONFIG.siteUrl;

function extractLinks(html, urlPath) {
  const internal = [];
  const external = [];
  const anchorRegex = /<a[^>]+href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchorRegex.exec(html)) !== null) {
    const href = m[1].trim();
    const linkText = m[2].replace(/<[^>]+>/g, "").trim();

    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) continue;
    if (href.startsWith("/") || href.startsWith(SITE_URL)) {
      const target = href.startsWith(SITE_URL) ? new URL(href).pathname : href;
      internal.push({ href: target, text: linkText });
    } else {
      external.push({ href, text: linkText });
    }
  }
  return { internal, external };
}

function checkLinkText(links, urlPath) {
  const findings = [];
  const badTexts = ["click here", "read more", "learn more", "this page", "here", "link", "this article"];
  for (const link of links) {
    const lt = link.text.toLowerCase();
    for (const bad of badTexts) {
      if (lt === bad || lt.startsWith(bad)) {
        findings.push({ type: "bad_link_text", severity: "LOW", page: urlPath, message: `Link text is generic ("${link.text}"): ${link.href.slice(0, 60)}` });
        break;
      }
    }
  }
  return findings;
}

function findOrphanPages(allPages, allInternalLinks) {
  const findings = [];
  const linkedPages = new Set();
  for (const [source, links] of Object.entries(allInternalLinks)) {
    for (const link of links) {
      linkedPages.add(link.href.replace(/\/$/, ""));
    }
  }
  for (const page of allPages) {
    if (page === "/" || isExcluded(page)) continue;
    if (!linkedPages.has(page) && !linkedPages.has(page + "/")) {
      findings.push({ type: "orphan_page", severity: "MEDIUM", page, message: `No internal links point to this page` });
    }
  }
  return findings;
}

export async function runLinkAnalysis() {
  const findings = [];
  const allPages = [];
  const allInternalLinks = {};
  const allExternalLinks = [];
  const linkCounts = {};

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "_astro" || e.name === "pagefind") continue;
        walk(full);
      } else if (e.name.endsWith(".html") && !e.name.startsWith("sitemap") && !full.includes("_astro") && !full.includes("pagefind")) {
        const html = fs.readFileSync(full, "utf-8");
        let urlPath = full
          .replace(DIST_DIR, "")
          .replace(/\\/g, "/")
          .replace(/\/index\.html$/, "")
          .replace(/\.html$/, "");
        if (urlPath === "") urlPath = "/";
        if (isExcluded(urlPath)) continue;

        allPages.push(urlPath);
        const { internal, external } = extractLinks(html, urlPath);
        allInternalLinks[urlPath] = internal;
        allExternalLinks.push(...external.map((l) => ({ ...l, source: urlPath })));
        linkCounts[urlPath] = { internal: internal.length, external: external.length };

        // Check internal link count
        if (internal.length < SEO_CONFIG.minInternalLinks) {
          findings.push({ type: "few_internal_links", severity: "MEDIUM", page: urlPath, message: `Only ${internal.length} internal links (min ${SEO_CONFIG.minInternalLinks})` });
        }

        // Check link text quality
        findings.push(...checkLinkText(internal, urlPath));
        findings.push(...checkLinkText(external, urlPath));

        // Count external links
        if (external.length > 10) {
          findings.push({ type: "many_external_links", severity: "LOW", page: urlPath, message: `${external.length} external links on one page` });
        }
      }
    }
  }

  walk(DIST_DIR);

  // Orphan pages
  const orphanFindings = findOrphanPages(allPages, allInternalLinks);
  findings.push(...orphanFindings);

  // Summary
  const totalInternal = Object.values(allInternalLinks).reduce((sum, links) => sum + links.length, 0);
  findings.push({ type: "link_summary", severity: "INFO", page: "/", message: `Found ${totalInternal} internal links across ${allPages.length} pages, ${allExternalLinks.length} external links` });

  return findings;
}
