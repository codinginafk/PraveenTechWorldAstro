import fs from "fs";
import path from "path";
import { SEO_CONFIG, DIST_DIR, isExcluded } from "./config.mjs";

function extractJsonLd(html, urlPath) {
  const findings = [];
  const ldRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
  let m;
  let idx = 0;
  while ((m = ldRegex.exec(html)) !== null) {
    idx++;
    const raw = m[1].trim();
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      findings.push({ type: "invalid_json_ld", severity: "HIGH", page: urlPath, message: `Invalid JSON-LD at index ${idx}: parse error` });
      continue;
    }

    const type = json["@type"] || "Unknown";

    // Validate Article schema
    if (type === "Article" || type === "NewsArticle" || type === "BlogPosting") {
      const requiredArticle = ["headline", "datePublished", "author"];
      for (const field of requiredArticle) {
        if (!json[field]) {
          findings.push({ type: "missing_article_field", severity: "HIGH", page: urlPath, message: `Article schema missing required field: "${field}"` });
        }
      }
      if (json.author && typeof json.author === "object" && !json.author["@type"]) {
        findings.push({ type: "author_missing_type", severity: "MEDIUM", page: urlPath, message: "Article author missing @type (should be \"Person\")" });
      }
      if (json.publisher && json.publisher["@type"] !== "Organization") {
        findings.push({ type: "publisher_wrong_type", severity: "MEDIUM", page: urlPath, message: "Article publisher should be @type \"Organization\"" });
      }
      if (!json.url) {
        findings.push({ type: "article_missing_url", severity: "MEDIUM", page: urlPath, message: "Article schema missing url field" });
      }
    }

    // Validate BreadcrumbList
    if (type === "BreadcrumbList") {
      if (!json.itemListElement || !Array.isArray(json.itemListElement)) {
        findings.push({ type: "breadcrumb_missing_items", severity: "HIGH", page: urlPath, message: "BreadcrumbList missing itemListElement array" });
      } else {
        if (json.itemListElement.length < 2) {
          findings.push({ type: "breadcrumb_too_few", severity: "LOW", page: urlPath, message: "BreadcrumbList has fewer than 2 items" });
        }
        for (const item of json.itemListElement) {
          if (!item["@type"] || item["@type"] !== "ListItem") {
            findings.push({ type: "breadcrumb_wrong_item_type", severity: "MEDIUM", page: urlPath, message: "Breadcrumb item should be @type \"ListItem\"" });
          }
          if (!item.position) {
            findings.push({ type: "breadcrumb_missing_position", severity: "MEDIUM", page: urlPath, message: "Breadcrumb item missing position" });
          }
          if (!item.name) {
            findings.push({ type: "breadcrumb_missing_name", severity: "MEDIUM", page: urlPath, message: "Breadcrumb item missing name" });
          }
        }
      }
    }

    // Validate WebSite schema
    if (type === "WebSite") {
      if (!json.name && !json.url) {
        findings.push({ type: "website_schema_incomplete", severity: "LOW", page: urlPath, message: "WebSite schema missing both name and url" });
      }
    }

    // Check for generic missing @context
    if (!json["@context"]) {
      findings.push({ type: "schema_missing_context", severity: "MEDIUM", page: urlPath, message: `Schema (${type}) missing @context` });
    }
  }

  if (idx === 0) {
    findings.push({ type: "no_json_ld", severity: "HIGH", page: urlPath, message: "Page has no JSON-LD structured data" });
  }

  return findings;
}

export async function runSchemaValidation() {
  const findings = [];
  let pagesWithSchema = 0;
  let totalPages = 0;

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

        totalPages++;
        const pageFindings = extractJsonLd(html, urlPath);
        const hasError = pageFindings.some((f) => f.type === "no_json_ld");
        if (!hasError) pagesWithSchema++;
        findings.push(...pageFindings);
      }
    }
  }

  walk(DIST_DIR);

  findings.push({ type: "schema_coverage", severity: "INFO", page: "/", message: `${pagesWithSchema}/${totalPages} pages have JSON-LD schema (${Math.round(pagesWithSchema / totalPages * 100)}%)` });

  return findings;
}
