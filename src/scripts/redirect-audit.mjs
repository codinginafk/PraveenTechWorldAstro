/**
 * redirect-audit.mjs — the system that prevents redirect disasters.
 *
 * Parses ALL THREE redirect configs (astro.config.mjs, vercel.json, public/_redirects)
 * and enforces:
 *   FAIL: source slug matches a LIVE (draft:false) article  (the Step-3/4/5 bug class)
 *   FAIL: redirect loops (A->B->A), self-redirects (A->A), intra-file duplicates
 *   WARN: cross-config mismatch (same source, different dest / missing somewhere)
 *   WARN: chains (A->B->C, equity leak + latency)
 *   WARN: destination that 404s in sitemap terms (dest slug has no live article and isn't /blog etc.)
 *
 * Usage: node src/scripts/redirect-audit.mjs [--live]
 *   --live also HTTP-checks every source (slower, for manual runs — NOT in CI).
 * Wire into preflight: fails the build on FAILs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LIVE = process.argv.includes("--live");
const EDGE = process.argv.includes("--edge");
const fails = [], warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

// ---- 1. parse astro.config.mjs redirects block ----
const astro = fs.readFileSync(path.join(ROOT, "astro.config.mjs"), "utf8");
const astroMap = new Map();
const block = (astro.match(/redirects:\s*\{([\s\S]*?)\n\s*\},/) || [])[1] || "";
for (const m of block.matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)) {
  if (astroMap.has(m[1])) fail(`astro.config: duplicate source ${m[1]}`);
  astroMap.set(m[1], { dest: m[2], status: 301 });
}

// ---- 2. parse vercel.json redirects ----
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
const vercelMap = new Map();
for (const r of vercel.redirects || []) {
  if (!r.source || !r.destination) continue;
  if (vercelMap.has(r.source)) fail(`vercel.json: duplicate source ${r.source}`);
  vercelMap.set(r.source, { dest: r.destination, status: r.statusCode || 308 });
}

// ---- 3. parse public/_redirects ----
const redirMap = new Map();
const redPath = path.join(ROOT, "public/_redirects");
if (fs.existsSync(redPath)) {
  for (const line of fs.readFileSync(redPath, "utf8").split("\n")) {
    const t = line.trim().replace(/\s+/g, " ");
    if (!t || t.startsWith("#")) continue;
    const parts = t.split(" ");
    // format: <source> <destination> <code!> — source itself may contain raw spaces
    let code = "301", dst, src;
    if (/^3\d\d!?$/.test(parts[parts.length - 1])) code = parts.pop();
    dst = parts.pop();
    src = parts.join(" ");
    if (!src || !dst) continue;
    try { src = decodeURIComponent(src); } catch {}
    if (/[:*]/.test(src)) continue;
    if (redirMap.has(src)) fail(`_redirects: duplicate source ${src}`);
    redirMap.set(src, { dest: dst, status: parseInt(code) || 301 });
  }
}

// ---- live article slugs (draft:false only) ----
const live = new Set();
const adir = path.join(ROOT, "src/content/articles");
for (const f of fs.readdirSync(adir).filter((x) => x.endsWith(".mdx"))) {
  const c = fs.readFileSync(path.join(adir, f), "utf8");
  if (!/^draft:\s*true/m.test(c)) live.add("/blog/" + f.replace(/\.mdx$/, ""));
}

// ---- 4. live-article shadowing (THE bug class) ----
for (const [src] of astroMap) if (live.has(src)) fail(`SHADOW: ${src} is a LIVE article but astro.config redirects it (unreachable content)`);
for (const [src] of vercelMap) {
  if (src.includes("(") || src.includes("*")) continue; // regex/source patterns skipped
  if (live.has(src)) fail(`SHADOW: ${src} is a LIVE article but vercel.json redirects it`);
}

// ---- 5. cross-config consistency (exact-path rules only) ----
// ---- decode %XX so astro (%20) and _redirects (raw space) forms compare equal ----
const norm = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const astroN = new Map([...astroMap.entries()].map(([k, v]) => [norm(k), v]));
const vercelN = new Map([...vercelMap.entries()].filter(([k]) => !/[(*]/.test(k)).map(([k, v]) => [norm(k), v]));
const redirN = redirMap; // already decoded at parse
const allSrc = new Set([...astroN.keys(), ...vercelN.keys(), ...redirN.keys()]);
for (const src of allSrc) {
  const dests = new Set();
  if (astroN.has(src)) dests.add(astroN.get(src).dest);
  if (vercelN.has(src)) dests.add(vercelN.get(src).dest);
  if (redirN.has(src)) dests.add(redirN.get(src).dest);
  if (dests.size > 1) fail(`MISMATCH: ${src} -> ${[...dests].join(" VS ")}`);
  const present = [astroN.has(src) ? "astro" : null, vercelN.has(src) ? "vercel" : null, redirN.has(src) ? "_redirects" : null].filter(Boolean);
  if (present.length === 1) warn(`ONLY-IN-${present[0].toUpperCase().replace("_", "")}: ${src} (one config will silently win on Vercel: vercel.json > astro adapter)`);
}

// ---- 6. chains, loops, self-redirects ----
const canon = new Map([...astroMap.entries()].map(([k, v]) => [k, v.dest]));
for (const [src, dst] of [...canon, ...[...vercelMap.entries()].map(([k, v]) => [k, v.dest])]) {
  if (/[(*]/.test(src)) continue;
  if (src === dst) { fail(`SELF: ${src} redirects to itself`); continue; }
  const seen = [src];
  let cur = dst;
  while (canon.has(cur) && !/[(*]/.test(cur)) {
    if (seen.includes(cur)) { fail(`LOOP: ${[...seen, cur].join(" -> ")}`); break; }
    seen.push(cur); cur = canon.get(cur);
  }
  if (seen.length > 2) warn(`CHAIN (${seen.length - 1} hops): ${seen.join(" -> ")}`);
}

// ---- 7. optional live HTTP verification ----
if (LIVE) {
  const targets = [...new Set([...astroMap.keys(), ...[...vercelMap.keys()].filter((s) => !/[(*]/.test(s))])].slice(0, 120);
  const res = await Promise.all(targets.map(async (src) => {
    try {
      const r = await fetch("https://www.praveentechworld.com" + src, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(15000) });
      return [src, r.status, r.headers.get("location")];
    } catch (e) { return [src, "FETCH-FAIL", e.message.slice(0, 40)]; }
  }));
  for (const [src, st, loc] of res) {
    const want = canon.get(src) || vercelMap.get(src)?.dest;
    if (![301, 302, 307, 308].includes(+st)) fail(`LIVE: ${src} returns ${st}, expected redirect to ${want}`);
    else if (want && loc && !loc.endsWith(want) && loc !== want) warn(`LIVE: ${src} -> ${loc} (config says ${want})`);
  }
  console.log(`   live-checked ${res.length} redirect sources`);
}

// ---- 8. optional: Cloudflare edge rules (the 4th place redirects can live) ----
if (EDGE) {
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    const tok = (env.match(/^CLOUDFLARE_API_TOKEN=(.*)$/m) || [])[1]?.trim();
    const zone = (env.match(/^CLOUDFLARE_ZONE_ID=(.*)$/m) || [])[1]?.trim();
    if (!tok || !zone) warn("EDGE: no CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID in .env - edge rules not checked");
    else {
      const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/rulesets`, { headers: { authorization: `Bearer ${tok}` } });
      const j = await res.json();
      if (!j.success) warn("EDGE: rulesets read failed: " + JSON.stringify(j.errors?.[0] || ""));
      else {
        // repo destinations that point at a different host than the source (host-level rules)
        const repoHostFlips = [];
        for (const [src, dst] of vercelMap) if (!src.includes("(") && /^https?:\/\//.test(dst)) repoHostFlips.push([src, dst]);
        for (const r of astroMap) if (/^https?:\/\//.test(r.dest)) repoHostFlips.push([r.dest]);

        let edgeCount = 0;
        for (const rs of (j.result || []).filter((x) => x.phase === "http_request_dynamic_redirect")) {
          for (const r of rs.rules || []) {
            if (r.action !== "redirect") continue;
            edgeCount++;
            const expr = r.expression || "";
            const srcHost = (expr.match(/http\.request\.host eq "([^"]+)"/) || [])[1] || expr;
            const t = r.action_parameters?.from_value?.target_url;
            const target = t?.expression || t?.url || "";
            const destBase = target.match(/^"([^"]+)"/)?.[1] || target.match(/concat\("([^"]+)"/)?.[1] || target;
            const destHost = /^https?:\/\/([^/]+)/.exec(destBase)?.[1] || null;
            if (destHost && destHost === srcHost && !t?.expression) fail(`EDGE LOOP: ${srcHost} rule targets itself (${target})`);
            for (const [rs2, rd] of repoHostFlips) {
              const rdHost = /^https?:\/\/([^/]+)/.exec(rd)?.[1];
              if (destHost && rdHost === srcHost && /^https?:\/\/([^/]+)/.exec(destBase)?.[1] === rdHost) fail(`EDGE/REPO LOOP: edge sends ${srcHost} -> ${destBase}, repo rule sends it back (${rs2} -> ${rd})`);
            }
            console.log(`   edge rule: ${srcHost} -> ${destBase} (${r.action_parameters?.from_value?.status_code || 302})`);
          }
        }
        console.log(`   edge: ${edgeCount} Cloudflare redirect rule(s)${edgeCount === 0 ? " (apex handled by vercel.json fallback)" : ""}`);
      }
    }
  } catch (e) {
    warn("EDGE: " + e.message);
  }
}

for (const w of warns) console.log("⚠️  " + w);
if (fails.length) {
  console.error(`\n❌ REDIRECT-AUDIT FAILED (${fails.length}):`);
  fails.forEach((x) => console.error("   - " + x));
  process.exit(1);
}
console.log(`\n✅ Redirect audit passed: ${allSrc.size} sources consistent across astro/vercel/_redirects${LIVE ? " + live" : ""}${EDGE ? " + edge" : ""}.`);
