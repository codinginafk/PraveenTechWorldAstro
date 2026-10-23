/**
 * critical-css.mjs — inline the above-the-fold rules, defer the rest.
 *
 * Why not the usual approach: hand-writing a "critical theme" duplicates values
 * that Tailwind already generated and misses whatever a template happens to use,
 * and with an async stylesheet there is no blocking fallback — a single missed
 * utility class means a visible flash of unstyled content on a live page.
 *
 * So this derives the inline block from the real artifacts:
 *   - rules come from the compiled stylesheet, in their original layer/at-rule
 *     order, so the cascade is unchanged;
 *   - selection is driven by the class tokens that actually appear in the
 *     above-the-fold markup of each built page;
 *   - @layer properties/theme/base are always inlined (small, and they carry the
 *     custom properties and resets everything else depends on);
 *   - a coverage check proves every above-fold class token has a rule in the
 *     inline block. If any page fails, that page keeps its blocking stylesheet
 *     instead of risking FOUC.
 *
 * Usage:  node src/scripts/critical-css.mjs [--measure] [--apply]
 *   default    report inline size + coverage for every page, change nothing
 *   --apply    rewrite the HTML (used by the build once coverage is trusted)
 */
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve(process.cwd(), "dist");
const APPLY = process.argv.includes("--apply");
const FOLD_CHARS = 6000; // how much of <main> counts as above the fold

// Optional: a directory of per-template class lists produced by a real layout
// engine (see scratch/gen-critical-classes.mjs). Preferred over the string
// heuristic, which cannot know what a browser puts in the first viewport.
const templateDirIndex = process.argv.indexOf("--template-classes");
const TEMPLATE_DIR = templateDirIndex !== -1 ? path.resolve(process.argv[templateDirIndex + 1]) : null;

const TEMPLATE_RULES = [
  { name: "home", test: (p) => p === "/" },
  { name: "article", test: (p) => /^\/blog\/[^/]+$/.test(p) },
  { name: "blog-index", test: (p) => p === "/blog" },
  { name: "guides", test: (p) => /^\/guides/.test(p) },
  { name: "taxonomy", test: (p) => /^\/(tag|category|categories)\//.test(p) },
  { name: "tools", test: (p) => /^\/tools/.test(p) },
  { name: "static", test: () => true },
];

function templateForPage(relativeHtmlPath) {
  const asUrl = "/" + relativeHtmlPath.replace(/\\/g, "/").replace(/index\.html$/, "").replace(/\/$/, "");
  for (const rule of TEMPLATE_RULES) if (rule.test(asUrl)) return rule.name;
  return "static";
}

if (!fs.existsSync(DIST)) {
  console.error("[critical-css] dist/ missing");
  process.exit(1);
}

/* ------------------------------------------------------------------ CSS parse */

const cssFiles = fs.readdirSync(path.join(DIST, "_astro")).filter((f) => f.endsWith(".css"));
if (cssFiles.length !== 1) {
  console.error(`[critical-css] expected exactly one stylesheet, found ${cssFiles.length}`);
  process.exit(1);
}
const cssName = cssFiles[0];
const css = fs.readFileSync(path.join(DIST, "_astro", cssName), "utf8");

/** Split a block body into statements at depth 0. */
function topLevelBlocks(source) {
  const out = [];
  let depth = 0;
  let start = 0;
  let selectorEnd = -1;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") {
      if (depth === 0) selectorEnd = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && selectorEnd !== -1) {
        const head = source.slice(start, selectorEnd).trim();
        const body = source.slice(selectorEnd + 1, i);
        out.push({ head, body, raw: source.slice(start, i + 1) });
        start = i + 1;
        selectorEnd = -1;
      }
    }
  }
  return out;
}

const CONDITIONAL = /^@(media|supports|container)\b/;

/**
 * Flatten into { context: string[], selector, body, raw, layer } in document
 * order. `context` holds the enclosing at-rule heads so the inline block can
 * reproduce them exactly.
 */
const rules = [];
function walk(source, context = [], layer = null) {
  for (const block of topLevelBlocks(source)) {
    const head = block.head;
    if (/^@layer\b/.test(head)) {
      const name = head.replace(/^@layer\s+/, "").trim();
      walk(block.body, context, name);
      continue;
    }
    if (CONDITIONAL.test(head)) {
      walk(block.body, [...context, head], layer);
      continue;
    }
    if (/^@(property|font-face|keyframes|-\w+-keyframes)\b/.test(head)) {
      rules.push({ context, layer, selector: head, body: block.body, raw: block.raw });
      continue;
    }
    rules.push({ context, layer, selector: head, body: block.body, raw: block.raw });
  }
}
walk(css);

const ALWAYS_INLINE_LAYERS = new Set(["properties", "theme", "base"]);

// Every class token that appears in any selector of the compiled stylesheet.
// A class outside this set is never styled, so it cannot cause FOUC.
const styledClasses = new Set();

/* ----------------------------------------------------------- selector matching */

const CLASS_TOKEN = /\.((?:\\.|[A-Za-z0-9_-])+)/g;

function classTokensOf(selector) {
  const tokens = [];
  for (const m of selector.matchAll(CLASS_TOKEN)) {
    // unescape CSS escapes: .lg\:grid-cols-\[1fr_250px\]
    const raw = m[1].replace(/\\(.)/g, "$1");
    tokens.push(raw);
  }
  return tokens;
}

for (const rule of rules) for (const t of classTokensOf(rule.selector)) styledClasses.add(t);

function ruleMatchesAboveFold(rule, aboveFoldClasses) {
  if (rule.layer && ALWAYS_INLINE_LAYERS.has(rule.layer)) return true;
  if (/^@(property|font-face|keyframes|-\w+-keyframes)\b/.test(rule.selector)) return rule.layer !== "utilities";

  // A rule like `h1, h2, .font-display { font-family: … }` must be included when
  // it styles a plain element, even though one branch of the list is a class that
  // may not appear above the fold. Judge each comma-separated branch separately.
  const branches = rule.selector.split(",").map((s) => s.trim());
  for (const branch of branches) {
    const tokens = classTokensOf(branch);
    if (tokens.length === 0) return true; // element / universal / :root
    if (tokens.some((t) => aboveFoldClasses.has(t))) return true;
  }
  return false;
}

/* --------------------------------------------------------------- page parsing */

function aboveFoldHtml(html) {
  // Start at <body>, not <header>: the skip link, the consent banner and any
  // wrapper element before the header still paint inside the first viewport.
  const bodyStart = html.search(/<body[\s>]/);
  if (bodyStart === -1) return "";
  const mainIndex = html.search(/<main[\s>]/);
  const end = mainIndex === -1 ? bodyStart + FOLD_CHARS : mainIndex + FOLD_CHARS;
  return html.slice(bodyStart, end);
}

function classesIn(html) {
  const set = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/)) if (cls) set.add(cls);
  }
  return set;
}

/**
 * Elements that are painted in the first viewport without being near the top of
 * the document: the cookie banner is `fixed` and lives at the end of <body>.
 * Pull their classes in explicitly, otherwise they render unstyled and then jump
 * into place — a layout shift, not just a flash.
 */
function outOfFlowClasses(html) {
  const set = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    const classes = m[1].split(/\s+/).filter(Boolean);
    if (!classes.some((c) => c === "fixed" || c === "sticky")) continue;
    for (const c of classes) set.add(c);
  }
  return set;
}

/* ------------------------------------------------------------------ per page */

function walkHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "pagefind") continue;
      walkHtml(full, out);
    } else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

const pages = walkHtml(DIST);
const kb = (n) => (n / 1024).toFixed(1);
const results = [];
let rewritten = 0;
let bailed = 0;

for (const page of pages) {
  const html = fs.readFileSync(page, "utf8");
  const linkRe = new RegExp(`<link[^>]+rel="stylesheet"[^>]*href="[^"]*${cssName}"[^>]*>`);
  const linkMatch = html.match(linkRe);
  if (!linkMatch) continue; // already inlined or no stylesheet

  const rel = path.relative(DIST, page);
  // Union of three sources, because each one alone under-approximates:
  //   - the template set comes from a real layout engine (accurate for the
  //     sampled page, blind to per-page blocks like a QuickAnswer box)
  //   - the heuristic set covers this page's own leading markup
  //   - fixed/sticky subtrees cover the consent banner and skip link
  // Over-including only costs bytes; under-including causes a flash.
  const classes = classesIn(aboveFoldHtml(html));
  if (TEMPLATE_DIR) {
    const template = templateForPage(rel);
    const classFile = path.join(TEMPLATE_DIR, `${template}.json`);
    if (!fs.existsSync(classFile)) {
      console.error(`[critical-css] missing template classes: ${classFile}`);
      process.exit(1);
    }
    for (const c of JSON.parse(fs.readFileSync(classFile, "utf8"))) classes.add(c);
  }
  for (const c of outOfFlowClasses(html)) classes.add(c);
  const selected = rules.filter((r) => ruleMatchesAboveFold(r, classes));

  // Emit consecutive runs that share the same (layer, context). Grouping all
  // rules of a context together would reorder the cascade — on a specificity tie
  // the later declaration wins, so document order has to be preserved.
  const chunks = [];
  let current = null;
  for (const rule of selected) {
    const key = `${rule.layer || ""}||${rule.context.join("||")}`;
    if (!current || current.key !== key) {
      current = { key, layer: rule.layer, context: rule.context, raws: [] };
      chunks.push(current);
    }
    current.raws.push(rule.raw);
  }

  const inlineCss = chunks
    .map((group) => {
      let body = group.raws.join("");
      for (let i = group.context.length - 1; i >= 0; i--) body = `${group.context[i]}{${body}}`;
      return group.layer ? `@layer ${group.layer}{${body}}` : body;
    })
    .join("");

  // Coverage only matters for classes the stylesheet actually styles. A class the
  // full CSS never mentions (legacy names like `bento-card`, `filter-chip`) cannot
  // cause a flash, so it must not block a page from being optimised.
  const mustCover = [...classes].filter((c) => styledClasses.has(c));
  const covered = new Set();
  for (const rule of selected) for (const t of classTokensOf(rule.selector)) covered.add(t);
  const missing = mustCover.filter((c) => !covered.has(c));
  const coverage = mustCover.length ? (mustCover.length - missing.length) / mustCover.length : 1;

  results.push({ page: path.relative(DIST, page), inlineBytes: inlineCss.length, coverage, missing: missing.slice(0, 5) });

  const safe = missing.length === 0 && inlineCss.length < 80 * 1024;
  if (!safe) {
    bailed++;
    continue;
  }
  if (!APPLY) continue;

  const asyncLink =
    `<style>${inlineCss}</style>` +
    `<link rel="preload" as="style" href="/_astro/${cssName}" onload="this.onload=null;this.rel='stylesheet'">` +
    `<noscript><link rel="stylesheet" href="/_astro/${cssName}"></noscript>`;
  fs.writeFileSync(page, html.replace(linkRe, asyncLink), "utf8");
  rewritten++;
}

/* -------------------------------------------------------------------- report */

const withInline = results.filter((r) => r.inlineBytes > 0);
const avg = withInline.reduce((a, r) => a + r.inlineBytes, 0) / Math.max(1, withInline.length);
const worst = [...withInline].sort((a, b) => b.inlineBytes - a.inlineBytes).slice(0, 5);
const imperfect = results.filter((r) => r.coverage < 1);

console.log(`[critical-css] stylesheet ${cssName} (${kb(css.length)} KB)`);
console.log(`[critical-css] pages examined: ${results.length}`);
console.log(`[critical-css] inline avg ${kb(avg)} KB, max ${kb(Math.max(...withInline.map((r) => r.inlineBytes)))} KB`);
console.log(`[critical-css] coverage 100% on ${results.length - imperfect.length}/${results.length} pages`);
if (imperfect.length) {
  console.log(`[critical-css] pages below 100% coverage (kept blocking): ${imperfect.length}`);
  for (const p of imperfect.slice(0, 6)) console.log(`   ${p.page}: ${(p.coverage * 100).toFixed(1)}% missing=${p.missing.join(",")}`);
}
console.log("[critical-css] largest inline blocks:");
for (const w of worst) console.log(`   ${kb(w.inlineBytes)} KB  ${w.page}`);
console.log(`[critical-css] ${APPLY ? `rewrote ${rewritten} page(s), kept blocking on ${bailed}` : "measure only — pass --apply to rewrite"}`);
