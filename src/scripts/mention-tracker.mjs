/**
 * mention-tracker.mjs — brand/link mention monitor (the free Brand24).
 *
 * Tracks: "praveentechworld" + key URLs across HN, Reddit, news/blogs (GDELT),
 * Wikipedia external links, Bluesky, Stack Exchange, GitHub code.
 * Dedupes via state file so repeat runs only surface NEW mentions.
 *
 * Usage:  node src/scripts/mention-tracker.mjs [--baseline]
 *   --baseline: record everything found without reporting (first run).
 * State:  research/agents/mention-tracker-seen.json (gitignored).
 * Report: printed + saved to research/agents/mention-report-<date>.md (gitignored).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STATE = path.join(ROOT, "research/agents/mention-tracker-seen.json");
const BASELINE = process.argv.includes("--baseline");

const QUERIES = ["praveentechworld.com", "praveentechworld", "DeGoogle Starter Pack", "degoogle-telemetry-2026"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, opts = {}) {
  const r = await fetch(url, { headers: { "User-Agent": "PTW-mention-tracker/1.0" }, signal: AbortSignal.timeout(30000), ...opts });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const ct = r.headers.get("content-type") || "";
  return ct.includes("json") ? r.json() : r.text();
}

const sources = {
  async hn() {
    const out = [];
    for (const q of ["praveentechworld", "DeGoogle Starter Pack"]) {
      const d = await get(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=(story,comment)`);
      for (const h of d.hits || []) {
        out.push({
          id: `hn:${h.objectID}`, source: "Hacker News",
          title: h.title || "(comment)",
          url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
          author: h.author, points: h.points ?? null,
          date: h.created_at?.slice(0, 10) || "",
          text: (h.comment_text || h.story_text || "").replace(/<[^>]+>/g, " ").slice(0, 300),
        });
      }
      await sleep(500);
    }
    return out;
  },

  async reddit() {
    const out = [];
    for (const q of ["praveentechworld", "DeGoogle Starter Pack"]) {
      for (const kind of ["comment", "submission"]) {
        try {
          const d = await get(`https://api.pullpush.io/reddit/${kind}/search/?q=${encodeURIComponent(q)}&limit=40&sort=desc`);
          for (const c of d.data || []) {
            const link = kind === "comment"
              ? `https://www.reddit.com/comments/${(c.link_id || "").replace("t3_", "")}/x/${c.id}/`
              : `https://www.reddit.com/comments/${c.id}/`;
            out.push({
              id: `reddit:${c.id}`, source: "Reddit",
              title: (c.title || c.subreddit ? `r/${c.subreddit}: ${(c.title || "").slice(0, 100)}` : "Reddit"),
              url: link, author: c.author, points: c.score ?? null,
              date: c.created_utc ? new Date(c.created_utc * 1000).toISOString().slice(0, 10) : "",
              text: (c.body || c.selftext || "").slice(0, 300).replace(/\n+/g, " "),
            });
          }
        } catch (e) { out.push({ id: `reddit:err:${kind}:${q}`, source: "Reddit", title: `lookup failed (${e.message}) — skipped`, url: "", _skip: true }); }
        await sleep(2500);
      }
    }
    return out.filter((x) => !x._skip);
  },

  async gdelt() {
    const out = [];
    const d = await get(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=%22praveentechworld%22&mode=artlist&maxrecords=50&format=json&timespan=3months&sort=datedesc`
    );
    for (const a of d.articles || []) {
      out.push({
        id: `gdelt:${a.url}`, source: "News/Blogs (GDELT)",
        title: a.title, url: a.url, author: a.sourceCommonName || "",
        points: null, date: (a.seendate || "").slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
        text: (a.socialimage || "").slice(0, 120),
      });
    }
    return out;
  },

  async wikipedia() {
    const out = [];
    const d = await get(
      `https://en.wikipedia.org/w/api.php?action=query&list=exturlusage&euquery=praveentechworld.com&eulimit=50&format=json&euprotocol=https&origin=*`
    );
    for (const p of d.query?.exturlusage || []) {
      out.push({
        id: `wiki:${p.pageid}:${p.url}`, source: "Wikipedia",
        title: p.title, url: `https://en.wikipedia.org/?curid=${p.pageid}`,
        author: "", points: null, date: "", text: `links to: ${(p.url || "").slice(0, 150)}`,
      });
    }
    return out;
  },

  async bluesky() {
    const out = [];
    for (const q of ["praveentechworld.com", "DeGoogle Starter Pack"]) {
      const d = await get(`https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&limit=25&sort=latest`);
      for (const p of d.posts || []) {
        const id = p.uri?.split("/").pop() || Math.random();
        out.push({
          id: `bsky:${id}`, source: "Bluesky",
          title: `@${p.author?.handle || "?"}`, url: `https://bsky.app/profile/${p.author?.handle || ""}/post/${id}`,
          author: p.author?.handle || "", points: p.likeCount ?? null,
          date: (p.record?.createdAt || "").slice(0, 10),
          text: (p.record?.text || "").slice(0, 300).replace(/\n+/g, " "),
        });
      }
      await sleep(500);
    }
    return out;
  },

  async stackexchange() {
    const out = [];
    for (const site of ["stackoverflow", "serverfault", "android", "superuser"]) {
      try {
        const d = await get(
          `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=activity&q=praveentechworld&site=${site}&pagesize=20`
        );
        for (const it of d.items || []) {
          out.push({
            id: `se:${site}:${it.question_id}#${it.answer_id || 0}`, source: `StackExchange (${site})`,
            title: it.title, url: it.link, author: it.owner?.display_name || "",
            points: it.score ?? null, date: it.creation_date ? new Date(it.creation_date * 1000).toISOString().slice(0, 10) : "",
            text: "",
          });
        }
      } catch { /* site with no hits or quota blip */ }
      await sleep(800);
    }
    return out;
  },

  async github() {
    const out = [];
    try {
      const raw = execSync(`gh api "search/code?q=${encodeURIComponent("praveentechworld")}+in:file&per_page=20" --jq '.items[] | [.path, .repository.full_name, .html_url] | @tsv'`, { encoding: "utf8", timeout: 30000 });
      for (const line of raw.trim().split("\n").filter(Boolean)) {
        const [p, repo, url] = line.split("\t");
        out.push({ id: `gh:${repo}:${p}`, source: "GitHub code", title: `${repo} — ${p}`, url, author: (repo || "").split("/")[0], points: null, date: "", text: "" });
      }
    } catch { /* gh not authed here or no hits */ }
    return out;
  },
};

let seen = {};
try { seen = JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { /* first run */ }

const fresh = [], counts = {};
for (const [name, fn] of Object.entries(sources)) {
  try {
    const items = await fn();
    counts[name] = items.length;
    for (const m of items) if (!seen[m.id]) { fresh.push(m); seen[m.id] = new Date().toISOString().slice(0, 10); }
  } catch (e) { counts[name] = `ERROR: ${e.message}`; }
  await sleep(1000);
}
fs.writeFileSync(STATE, JSON.stringify(seen, null, 1));

const day = new Date().toISOString().slice(0, 10);
let md = `# Mention report ${day}\n\nScanned: ${Object.entries(counts).map(([k, v]) => `${k} (${v})`).join(" · ")}\n\n`;
if (BASELINE) md += `BASELINE RUN — ${fresh.length} existing mentions recorded, not reported.\n`;
else if (!fresh.length) md += `No NEW mentions since last run. ✅\n`;
else {
  md += `## 🔔 ${fresh.length} NEW mention(s)\n\n`;
  for (const m of fresh) {
    md += `### [${m.title}](${m.url})\n- source: ${m.source}${m.author ? ` · by ${m.author}` : ""}${m.date ? ` · ${m.date}` : ""}${m.points != null ? ` · ${m.points} pts` : ""}\n${m.text ? `> ${m.text}\n` : ""}\n`;
  }
}
const reportPath = path.join(ROOT, "research/agents", `mention-report-${day}.md`);
fs.writeFileSync(reportPath, md);
console.log(md);
console.log(`\nstate: ${Object.keys(seen).length} known · report: ${reportPath}`);
