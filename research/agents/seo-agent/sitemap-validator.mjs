import fs from "fs";
import path from "path";
import { SEO_CONFIG, DIST_DIR, isExcluded } from "./config.mjs";

function parseSitemapXml(xml) {
  const urls = [];
  const children = [];
  const isIndex = xml.includes("<sitemapindex") || xml.includes("<sitemapindex>");

  if (isIndex) {
    const childRegex = /<loc>\s*([^<]+?sitemap[^<]+?\.xml)\s*<\/loc>/gi;
    let match;
    while ((match = childRegex.exec(xml)) !== null) {
      children.push(match[1].trim());
    }
  } else {
    const locRegex = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
      urls.push(match[1].trim());
    }
  }
  return { urls, children };
}

function getHrefLangIssues(urls) {
  const issues = [];
  const pathCounts = {};
  for (const url of urls) {
    try {
      const p = new URL(url).pathname.replace(/\/$/, "");
      pathCounts[p] = (pathCounts[p] || 0) + 1;
    } catch { }
  }
  for (const [p, count] of Object.entries(pathCounts)) {
    if (count > 1) {
      issues.push({ type: "duplicate_url", severity: "HIGH", page: p, message: `Duplicate sitemap entry (${count}x): ${p}` });
    }
  }
  return issues;
}

function findMissingPages(sitemapUrls, distFiles) {
  const issues = [];
  const sitemapPaths = new Set();
  for (const url of sitemapUrls) {
    try {
      let p = new URL(url).pathname.replace(/\/$/, "");
      if (p === "") p = "/";
      sitemapPaths.add(p);
    } catch { }
  }
  const htmlFiles = distFiles.filter((f) => f.endsWith(".html") && !f.includes("_astro"));
  for (const file of htmlFiles) {
    let urlPath = file
      .replace(DIST_DIR, "")
      .replace(/\\/g, "/")
      .replace(/\/index\.html$/, "")
      .replace(/\.html$/, "");
    if (urlPath === "") urlPath = "/";
    if (isExcluded(urlPath)) continue;
    if (!sitemapPaths.has(urlPath)) {
      issues.push({ type: "missing_from_sitemap", severity: "MEDIUM", page: urlPath, message: `Page exists in dist but not in sitemap: ${urlPath}` });
    }
  }
  return issues;
}

export async function runSitemapValidation() {
  const findings = [];

  // Find sitemap files, process index files first
  const files = fs.readdirSync(DIST_DIR).filter((f) => f.startsWith("sitemap")).sort((a, b) => {
    const aIsIndex = a.includes("index");
    const bIsIndex = b.includes("index");
    if (aIsIndex && !bIsIndex) return -1;
    if (!aIsIndex && bIsIndex) return 1;
    return 0;
  });
  if (files.length === 0) {
    findings.push({ type: "no_sitemap", severity: "CRITICAL", page: "/", message: "No sitemap files found in dist directory" });
    return findings;
  }

  let allUrls = [];
  let sitemapIndexFound = false;
  const childNames = new Set();

  for (const file of files) {
    const xml = fs.readFileSync(path.join(DIST_DIR, file), "utf-8");
    const parsed = parseSitemapXml(xml);

    if (parsed.children.length > 0) {
      sitemapIndexFound = true;
      for (const child of parsed.children) {
        const childName = path.basename(new URL(child).pathname);
        childNames.add(childName);
        const childPath = path.join(DIST_DIR, childName);
        if (fs.existsSync(childPath)) {
          const childXml = fs.readFileSync(childPath, "utf-8");
          const childParsed = parseSitemapXml(childXml);
          allUrls.push(...childParsed.urls);
        } else {
          findings.push({ type: "missing_child_sitemap", severity: "HIGH", page: child, message: `Child sitemap referenced but not found locally: ${childName}` });
        }
      }
    } else if (!childNames.has(file)) {
      allUrls.push(...parsed.urls);
    }
  }

  // Total URL count
  findings.push({ type: "sitemap_url_count", severity: "INFO", page: "/", message: `Sitemap contains ${allUrls.length} URLs across ${files.length} file(s)` });

  // Check for excluded pages that should not be in sitemap
  for (const url of allUrls) {
    try {
      const p = new URL(url).pathname;
      if (!isExcluded(p)) continue;
      findings.push({ type: "excluded_in_sitemap", severity: "LOW", page: p, message: `Excluded page found in sitemap: ${p}` });
    } catch { }
  }

  // Check for duplicate URLs
  const dupIssues = getHrefLangIssues(allUrls);
  findings.push(...dupIssues);

  // Check for pages in dist not in sitemap
  const distFiles = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else distFiles.push(full);
    }
  }
  walk(DIST_DIR);
  const missingIssues = findMissingPages(allUrls, distFiles);
  findings.push(...missingIssues);

  return findings;
}
