import fs from "fs";
import path from "path";
import { SEO_CONFIG, DIST_DIR, isExcluded } from "./config.mjs";

function extractImages(html, urlPath) {
  const findings = [];

  // Standard img tags
  const imgRegex = /<img[^>]+>/gi;
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    const tag = m[0];

    const srcMatch = tag.match(/src=["']([^"']*)["']/i);
    const src = srcMatch ? srcMatch[1] : "";

    const altMatch = tag.match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : "";

    const loadingMatch = tag.match(/loading=["']([^"']*)["']/i);
    const loading = loadingMatch ? loadingMatch[1] : "";

    if (!alt) {
      findings.push({ type: "missing_alt", severity: "HIGH", page: urlPath, message: `Image missing alt text: ${src.slice(0, 80)}` });
    }

    if (loading !== "lazy" && !tag.includes("loading=")) {
      // Skip if it's likely above-the-fold (few images qualify)
      findings.push({ type: "missing_lazy_loading", severity: "LOW", page: urlPath, message: `Image not lazy-loaded: ${src.slice(0, 80)}` });
    }

    // Check for modern formats
    if (src && !src.includes(".webp") && !src.includes(".avif") && !src.startsWith("data:")) {
      const ext = path.extname(src.split("?")[0]).toLowerCase();
      if ([".jpg", ".jpeg", ".png", ".gif"].includes(ext)) {
        findings.push({ type: "not_webp_avif", severity: "LOW", page: urlPath, message: `Image uses legacy format (${ext}): ${src.slice(0, 60)}` });
      }
    }
  }

  return findings;
}

export async function runImageAudit() {
  const findings = [];
  const imageDirs = [];

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

        const imgFindings = extractImages(html, urlPath);
        findings.push(...imgFindings);
      }
    }
  }

  walk(DIST_DIR);

  // Check static image files in dist/images
  const imagesDir = path.join(DIST_DIR, "images");
  if (fs.existsSync(imagesDir)) {
    const imgFiles = fs.readdirSync(imagesDir).filter((f) => /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(f));
    for (const file of imgFiles) {
      const filePath = path.join(imagesDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      if (sizeKB > SEO_CONFIG.maxImageSizeKB) {
        findings.push({ type: "large_image", severity: "MEDIUM", page: `/images/${file}`, message: `Image too large: ${sizeKB}KB (max ${SEO_CONFIG.maxImageSizeKB}KB): ${file}` });
      }
    }
  }

  return findings;
}
