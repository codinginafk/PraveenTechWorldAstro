/**
 * lint-internal-links.mjs — failing gate for internal link integrity.
 *
 * Historical failure classes this exists to stop:
 *   - ~50 in-body links pointed at redirect SOURCES (extra 301 hop per crawl)
 *   - 5 links pointed at draft:true articles, which are never built -> live 404
 *   - 1 link pointed at an image that does not exist in public/
 *
 * Resolves every internal href/src in src/content/articles/*.mdx against the
 * redirect map, the published slug set and the public/ asset tree.
 *
 * Exit 1 on any broken or redirected internal target.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARTICLES = path.join(ROOT, "src/content/articles");
const PUBLIC = path.join(ROOT, "public");

const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
const redirects = new Map();
for (const r of vercel.redirects || []) {
  if (!r.source || /[(*:]/.test(r.source)) continue;
  redirects.set(r.source, r.destination);
}

const published = new Set();
const drafts = new Set();
for (const file of fs.readdirSync(ARTICLES).filter((f) => f.endsWith(".mdx"))) {
  const slug = "/blog/" + file.replace(/\.mdx$/, "");
  const src = fs.readFileSync(path.join(ARTICLES, file), "utf8");
  (/^draft:\s*true/m.test(src) ? drafts : published).add(slug);
}

const assetExists = (p) => {
  const clean = decodeURIComponent(p.split("?")[0].split("#")[0]);
  return fs.existsSync(path.join(PUBLIC, clean.replace(/^\//, "")));
};

const broken = [];
const redirected = [];
const missingAsset = [];

for (const file of fs.readdirSync(ARTICLES).filter((f) => f.endsWith(".mdx"))) {
  const src = fs.readFileSync(path.join(ARTICLES, file), "utf8");
  const lines = src.split("\n");
  let inFence = false;
  lines.forEach((line, i) => {
    // Paths inside fenced code blocks are illustrative snippets, not links.
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const refs = [
      ...line.matchAll(/\]\((\/[^)\s]*)\)/g),
      ...line.matchAll(/(?:href|src)="(\/[^"]*)"/g),
    ].map((m) => m[1]);

    for (const raw of refs) {
      const target = raw.replace(/\/$/, "").split("#")[0].split("?")[0];
      if (!target || target === "/") continue;

      if (redirects.has(target)) {
        redirected.push(`${file}:${i + 1} ${target} -> should be ${redirects.get(target)}`);
        continue;
      }
      if (target.startsWith("/blog/")) {
        if (drafts.has(target)) broken.push(`${file}:${i + 1} ${target} (draft, never built)`);
        else if (!published.has(target) && !redirects.has(target)) {
          broken.push(`${file}:${i + 1} ${target} (no article)`);
        }
        continue;
      }
      if (/^\/(images|downloads|fonts)\//.test(target) && !assetExists(target)) {
        missingAsset.push(`${file}:${i + 1} ${target}`);
      }
    }
  });
}

const report = (label, list, limit = 15) => {
  if (!list.length) return;
  console.error(`\n${label} (${list.length}):`);
  list.slice(0, limit).forEach((x) => console.error("  - " + x));
  if (list.length > limit) console.error(`  … and ${list.length - limit} more`);
};

report("Links still pointing at redirect sources", redirected);
report("Links to unpublished/draft articles", broken);
report("Links to missing public assets", missingAsset);

const total = redirected.length + broken.length + missingAsset.length;
if (total > 0) {
  console.error(`\n❌ internal-link lint failed: ${total} problem(s)`);
  process.exit(1);
}
console.log(`✅ internal-link lint passed: ${published.size} published slugs, 0 redirect hops, 0 dead targets`);
