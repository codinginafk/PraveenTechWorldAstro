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

// Get article that still has noindex (windows-11-volume)
const res = await fetch(api + "/articles/4133472", { headers });
const a = await res.json();
console.log("=== ARTICLE STATE ===");
console.log(JSON.stringify({
  id: a.id,
  canonical_url: a.canonical_url,
  published: a.published,
  tags: a.tags,
  url: a.url,
}, null, 2));

// Also get the article that WORKED (chatgpt-tracking) - find its ID
const listRes = await fetch(api + "/articles/me/published?per_page=100", { headers });
const articles = await listRes.json();
const working = articles.find(a => a.canonical_url === null || !a.canonical_url?.includes("praveentechworld.com"));
if (working) {
  console.log("\n=== ARTICLE THAT WORKED (comparison) ===");
  console.log(JSON.stringify({
    id: working.id,
    title: working.title?.slice(0, 50),
    canonical_url: working.canonical_url,
    published: working.published,
    tags: working.tags,
  }, null, 2));
}

fs.rmSync(new URL(import.meta.url).pathname);
