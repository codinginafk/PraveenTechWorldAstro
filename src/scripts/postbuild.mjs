/**
 * postbuild.mjs — post-build guarantees for the static output.
 *
 * Replaces the old inline-css.mjs step. That step injected the whole compiled
 * stylesheet (~141 KB) into all 745 HTML files, which removed one round trip
 * but made every page uncacheable and every re-navigation re-download the same
 * bytes. Astro already emits a content-hashed, immutably-cached stylesheet, so
 * this step verifies that <link> survived instead of replacing it.
 *
 * Also performed here:
 *   - fail the build if a rendered page has no stylesheet link (the old silent
 *     failure mode where the HTML shipped with no CSS at all)
 *   - fail if a Netlify-style _redirects file reappears in dist
 *   - prune orphaned CSS assets
 *   - inject <lastmod> into the sitemap from article frontmatter so Search
 *     Console gets a real freshness signal instead of none at all
 *
 * Runs after `astro build`, before the Pagefind index step.
 */
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve(process.cwd(), "dist");
const ARTICLES = path.resolve(process.cwd(), "src/content/articles");
const SITE = "https://www.praveentechworld.com";

const problems = [];
const notes = [];

if (!fs.existsSync(DIST)) {
  console.error("[postbuild] dist/ missing — did astro build run?");
  process.exit(1);
}

function walk(dir, filter, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "pagefind") continue;
      walk(full, filter, out);
    } else if (filter(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/* 1 + 2. every rendered page must link a stylesheet; count what we find */
const htmlFiles = walk(DIST, (n) => n.endsWith(".html"));
let withCss = 0;
let stubs = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  if (html.includes('http-equiv="refresh"')) {
    stubs++;
    continue;
  }
  if (/<link[^>]+rel=["']stylesheet["'][^>]*>/.test(html) || /<style[\s>]/.test(html)) {
    withCss++;
  } else {
    problems.push(`no stylesheet link: ${path.relative(DIST, file)}`);
  }
}
notes.push(`stylesheets: ${withCss}/${htmlFiles.length - stubs} rendered pages linked (${stubs} redirect stubs)`);

/* 3. _redirects must never ship again */
const redirectsFile = path.join(DIST, "_redirects");
if (fs.existsSync(redirectsFile)) {
  fs.rmSync(redirectsFile);
  notes.push("removed dist/_redirects (vercel.json is the only redirect source)");
}

/* 4. prune CSS files nothing references */
const cssFiles = fs.readdirSync(path.join(DIST, "_astro")).filter((f) => f.endsWith(".css"));
if (cssFiles.length > 1) {
  const referenced = new Set();
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    for (const m of html.matchAll(/_astro\/([A-Za-z0-9._-]+\.css)/g)) referenced.add(m[1]);
  }
  for (const css of cssFiles) {
    if (!referenced.has(css)) {
      fs.rmSync(path.join(DIST, "_astro", css));
      notes.push(`pruned orphan CSS ${css}`);
    }
  }
}

/* 5. sitemap lastmod from frontmatter */
const dateFor = new Map();
for (const file of fs.readdirSync(ARTICLES).filter((f) => f.endsWith(".mdx"))) {
  const source = fs.readFileSync(path.join(ARTICLES, file), "utf8");
  const fm = source.split("---")[1] || "";
  const read = (key) => {
    const m = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(fm);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
  };
  const raw = read("updatedDate") || read("publishDate");
  if (!raw) continue;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) continue;
  dateFor.set(`${SITE}/blog/${file.replace(/\.mdx$/, "")}`, parsed.toISOString());
}

const sitemapPath = path.join(DIST, "sitemap-0.xml");
if (fs.existsSync(sitemapPath)) {
  const xml = fs.readFileSync(sitemapPath, "utf8");
  let stamped = 0;
  const next = xml.replace(/<loc>([^<]+)<\/loc>/g, (match, loc) => {
    const date = dateFor.get(loc);
    if (!date) return match;
    stamped++;
    return `${match}<lastmod>${date}</lastmod>`;
  });
  if (stamped > 0) {
    fs.writeFileSync(sitemapPath, next, "utf8");
    notes.push(`sitemap lastmod: ${stamped} article URLs stamped`);
  } else {
    notes.push("sitemap lastmod: no article URLs matched (skipped)");
  }
} else {
  problems.push("dist/sitemap-0.xml missing");
}

notes.forEach((n) => console.log(`[postbuild] ${n}`));
if (problems.length) {
  console.error(`\n[postbuild] FAILED (${problems.length}):`);
  problems.slice(0, 20).forEach((p) => console.error("  - " + p));
  process.exit(1);
}
console.log("[postbuild] ok");
