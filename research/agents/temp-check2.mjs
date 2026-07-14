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

// Get the working article's details for comparison
const listRes = await fetch(api + "/articles/me/published?per_page=100", { headers });
const articles = await listRes.json();

// Find the one that worked (no praveentechworld canonical)
for (const a of articles) {
  const url = `https://dev.to/youngones/${a.slug}`;
  const htmlRes = await fetch(url);
  const html = await htmlRes.text();
  const hasNoindex = html.includes('noindex');
  console.log(`ID: ${a.id} | noindex: ${hasNoindex} | tags: ${JSON.stringify(a.tags)} | canonical: ${a.canonical_url?.slice(0,60)}`);
}

fs.rmSync(new URL(import.meta.url).pathname);
