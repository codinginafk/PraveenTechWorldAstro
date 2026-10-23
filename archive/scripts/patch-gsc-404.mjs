/**
 * Patch GSC coverage buckets into the redirect registry:
 *   A) 22 legacy /tag/* 404s        -> canonical hubs (vercel.json + _redirects)
 *   B) 9 astro-only redirects       -> vercel.json (kills 200 meta-refresh stubs)
 *   C) safe ?m=1 query-strip rules  -> vercel.json (non-looping dests only)
 * Re-run: node src/scripts/redirect-audit.mjs  (must pass)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const vercelPath = path.join(ROOT, "vercel.json");
const redPath = path.join(ROOT, "public/_redirects");
const v = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
v.redirects = v.redirects || [];
const has = (s) => v.redirects.some((r) => r.source === s);

// A) tag 404s -> hubs
const TAGS = {
  "/tag/Windows": "/guides/windows-fixes",
  "/tag/Windows%20Fixes": "/guides/windows-fixes",
  "/tag/BSOD": "/guides/windows-fixes",
  "/tag/Virus": "/guides/windows-fixes",
  "/tag/Battery": "/guides/windows-fixes",
  "/tag/Update": "/guides/windows-fixes",
  "/tag/Optimization": "/guides/windows-fixes",
  "/tag/Troubleshooting": "/guides/hardware-troubleshooting",
  "/tag/Fix": "/guides/windows-fixes",
  "/tag/Tech": "/guides/windows-fixes",
  "/tag/App%20Optimization": "/guides/android-fixes",
  "/tag/Website%20Speed": "/guides/seo",
  "/tag/Android": "/guides/android-fixes",
  "/tag/Privacy": "/guides/privacy",
  "/tag/Privacy%20Security": "/guides/privacy",
  "/tag/Google": "/guides/seo",
  "/tag/Search": "/guides/seo",
  "/tag/Degoogl": "/blog/degoogle-starter-pack-complete-guide",
  "/tag/Linux": "/blog",
  "/tag/Mac": "/blog",
  "/tag/How%20To": "/blog",
  "/tag/Guides": "/guides",
};
let added = 0;
for (const [src, dst] of Object.entries(TAGS)) {
  if (!has(src)) { v.redirects.push({ source: src, destination: dst, statusCode: 301 }); added++; }
}

// B) astro-only redirects (200 meta-refresh stubs live) -> vercel.json 301
const astro = fs.readFileSync(path.join(ROOT, "astro.config.mjs"), "utf8");
const block = (astro.match(/redirects:\s*\{([\s\S]*?)\n\s*\},/) || [])[1] || "";
let synced = 0;
for (const m of block.matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)) {
  const [src, dst] = [m[1], m[2]];
  if (has(src)) continue;
  if (v.redirects.some((r) => r.destination === dst && r.source === src)) continue;
  v.redirects.push({ source: src, destination: dst, statusCode: 301 });
  synced++;
}

// C) ?m=1 query-strip: intentionally NOT implemented here.
//    Vercel preserves the incoming query when the destination has no query
//    (verified live: /p/contact-us?m=1 -> /contact?m=1), so a has-rule on a
//    same-path source would redirect to itself = loop. Per-path redirects
//    already cover the legacy Blogger URLs; the residual ?m=1 URLs are
//    duplicates, not crawl errors.

fs.writeFileSync(vercelPath, JSON.stringify(v, null, 2) + "\n");

// mirror A+B into _redirects (append, dedupe by source)
let red = fs.readFileSync(redPath, "utf8").split("\n");
const existing = new Set(red.map((l) => (l.trim().split(/\s+/)[0] || "").toLowerCase()));
const add = [];
for (const [src, dst] of Object.entries(TAGS)) if (!existing.has(src.toLowerCase())) add.push(`${src}  ${dst}  301`);
for (const m of block.matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)) if (!existing.has(m[1].toLowerCase())) add.push(`${m[1]}  ${m[2]}  301`);
if (add.length) red = red.concat(add);
fs.writeFileSync(redPath, red.join("\n"));

console.log(`tags added: ${added} | astro-synced: ${synced} | _redirects appended: ${add.length}`);
console.log(`vercel redirects total: ${v.redirects.length}`);
