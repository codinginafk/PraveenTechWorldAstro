import fs from "fs";
import path from "path";

const ROOT_DIR = path.resolve(import.meta.dirname, "../..");
const envContent = fs.readFileSync(path.join(ROOT_DIR, ".env"), "utf-8");
let devtoKey = "";
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (t.startsWith("DEVTO_API_KEY=")) {
    devtoKey = t.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
  }
}

if (!devtoKey) { console.error("No DEVTO_API_KEY"); process.exit(1); }

const api = "https://dev.to/api";
const headers = { "api-key": devtoKey, "Content-Type": "application/json", accept: "application/vnd.forem.api-v1+json" };

const res = await fetch(api + "/articles/me/published?per_page=100", { headers });
const articles = await res.json();
console.log(`Found ${articles.length} published articles.`);

// Keep these 5 — they don't have noindex
const keepIds = new Set([4131288, 4131280, 4103593, 3988929, 3941814]);
const toRemove = articles.filter(a => !keepIds.has(a.id));

console.log(`Unpublishing ${toRemove.length} articles (keeping ${articles.length - toRemove.length})...`);

let done = 0;
for (const a of toRemove) {
  const res = await fetch(`${api}/articles/${a.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ article: { published: false } }),
  });

  if (res.ok) {
    console.log(`  [${++done}/${toRemove.length}] UNPUBLISHED #${a.id}: ${a.title?.slice(0, 60)}`);
  } else {
    const err = await res.text().catch(() => "");
    console.log(`  [${++done}/${toRemove.length}] FAILED #${a.id}: ${res.status} ${err.slice(0, 80)}`);
  }

  await new Promise(r => setTimeout(r, 1100));
}

console.log(`\nDone. ${done} processed.`);
