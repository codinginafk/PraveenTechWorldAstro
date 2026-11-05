import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const vercelPath = path.join(ROOT, "vercel.json");
const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));

// 1. Generate _redirects
const redirectsLines = [
  "# Cloudflare Pages Redirects & Rewrites (Generated from vercel.json)",
  "# Preserves 100% of legacy Blogger, tag, and article migration 301 redirects",
  ""
];

const seenSources = new Set();

function addRule(source, destination, code) {
  let decoded = source;
  try { decoded = decodeURIComponent(source); } catch {}
  if (seenSources.has(decoded)) {
    return; // Skip duplicate decoded source (e.g. %20 vs space)
  }
  seenSources.add(decoded);
  // Ensure source with space is either kept or encoded; in _redirects format, space separates src and dst,
  // so encoded source (%20) is safer for HTTP clients!
  const safeSource = source.includes(" ") ? encodeURI(source) : source;
  redirectsLines.push(`${safeSource} ${destination} ${code}`);
}

// Rewrites first (status 200)
if (vercel.rewrites) {
  for (const rw of vercel.rewrites) {
    addRule(rw.source, rw.destination, 200);
  }
}

// Redirects (status 301 / 302)
if (vercel.redirects) {
  for (const r of vercel.redirects) {
    const status = r.statusCode || (r.permanent ? 301 : 302);
    addRule(r.source, r.destination, status);
  }
}

const redirectsContent = redirectsLines.join("\n") + "\n";
fs.writeFileSync(path.join(ROOT, "public/_redirects"), redirectsContent, "utf8");
console.log(`Generated public/_redirects with ${redirectsLines.length - 3} unique rules.`);

// 2. Generate _headers
const headersLines = [
  "# Cloudflare Pages Custom Headers (Generated from vercel.json)",
  "# Global security headers, CSP, and asset cache rules",
  "",
  "/*"
];

// Extract global headers from /(.*)
const globalRule = vercel.headers.find(h => h.source === "/(.*)");
if (globalRule) {
  for (const hdr of globalRule.headers) {
    headersLines.push(`  ${hdr.key}: ${hdr.value}`);
  }
}

// Specific asset caches
const assetCaches = [
  { path: "/_astro/*", maxAge: 31536000, immutable: true },
  { path: "/images/*", maxAge: 31536000, immutable: true },
  { path: "/fonts/*", maxAge: 31536000, immutable: true },
  { path: "/favicon/*", maxAge: 2592000, immutable: false },
  { path: "/pagefind/*", maxAge: 3600, immutable: false },
  { path: "/rss.xml", headers: [{ key: "Content-Type", value: "application/xml; charset=utf-8" }, { key: "X-Robots-Tag", value: "noindex, follow" }] },
  { path: "/ads.txt", headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }, { key: "Access-Control-Allow-Origin", value: "*" }] },
  { path: "/robots.txt", headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }, { key: "Access-Control-Allow-Origin", value: "*" }] },
  { path: "/.well-known/security.txt", headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }, { key: "Access-Control-Allow-Origin", value: "*" }] }
];

for (const item of assetCaches) {
  headersLines.push("");
  headersLines.push(item.path);
  if (item.maxAge) {
    const val = item.immutable ? `public, max-age=${item.maxAge}, immutable` : `public, max-age=${item.maxAge}`;
    headersLines.push(`  Cache-Control: ${val}`);
  }
  if (item.headers) {
    for (const hdr of item.headers) {
      headersLines.push(`  ${hdr.key}: ${hdr.value}`);
    }
  }
}

const headersContent = headersLines.join("\n") + "\n";
fs.writeFileSync(path.join(ROOT, "public/_headers"), headersContent, "utf8");
console.log(`Generated public/_headers with ${headersLines.length} lines.`);
