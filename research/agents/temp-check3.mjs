import fs from "fs";
import path from "path";

const ROOT_DIR = path.resolve(import.meta.dirname, "../..");
const envPath = path.join(ROOT_DIR, ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
let devtoKey = "";
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (t.startsWith("DEVTO_API_KEY=")) {
    devtoKey = t.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
  }
}

const api = "https://dev.to/api";
const headers = { "api-key": devtoKey, "Content-Type": "application/json", accept: "application/vnd.forem.api-v1+json" };

// Fetch individual articles to see full state including tags
const noindexFalse = [4131288, 4131280, 4103593, 3988929, 3941814];
const noindexTrue = [4133472, 4131308, 4119415, 4021936, 3859135];

console.log("=== ARTICLES WITH noindex:false ===");
for (const id of noindexFalse) {
  const res = await fetch(api + "/articles/" + id, { headers });
  const a = await res.json();
  console.log(`ID ${id}: published_at=${a.published_at?.slice(0,10)} tags=${JSON.stringify(a.tags)} canonical=${a.canonical_url?.slice(0,50)}`);
}

console.log("\n=== ARTICLES WITH noindex:true ===");
for (const id of noindexTrue) {
  const res = await fetch(api + "/articles/" + id, { headers });
  const a = await res.json();
  console.log(`ID ${id}: published_at=${a.published_at?.slice(0,10)} tags=${JSON.stringify(a.tags)} canonical=${a.canonical_url?.slice(0,50)}`);
}

// Try unpublishing then republishing article 4133472 to see if it clears noindex
console.log("\n=== TEST: Unpublish and republish article 4133472 ===");

// First unpublish
let res = await fetch(api + "/articles/4133472", {
  method: "PUT",
  headers,
  body: JSON.stringify({ article: { published: false } }),
});
let a = await res.json();
console.log(`Unpublished: ${a.published}`);

// Republish without canonical
await new Promise(r => setTimeout(r, 2000));
res = await fetch(api + "/articles/4133472", {
  method: "PUT",
  headers,
  body: JSON.stringify({ article: { published: true, canonical_url: null } }),
});
a = await res.json();
console.log(`Republished: canonical=${a.canonical_url}`);

// Check HTML
const htmlRes = await fetch("https://dev.to/youngones/windows-11-volume-control-not-working-8-fixes-5h98");
const html = await htmlRes.text();
console.log(`After republish - noindex still: ${html.includes('noindex')}`);

fs.rmSync(new URL(import.meta.url).pathname);
