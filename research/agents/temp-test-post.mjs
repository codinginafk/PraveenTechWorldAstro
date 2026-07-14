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

// Post a tiny test article WITHOUT canonical_url
const testRes = await fetch(api + "/articles", {
  method: "POST",
  headers,
  body: JSON.stringify({
    article: {
      title: "Test article - delete me",
      published: true,
      body_markdown: "This is a test article to verify noindex behavior. Delete me.",
      tags: ["testing", "meta"],
      description: "Testing noindex behavior on Dev.to",
    },
  }),
});

const testArticle = await testRes.json();
console.log("Posted test article:", testArticle.id);
console.log("URL:", testArticle.url);

// Check HTML for noindex
const htmlRes = await fetch(testArticle.url);
const html = await htmlRes.text();
console.log("Has noindex:", html.includes('noindex'));
console.log("Has canonical:", html.includes('rel="canonical"'));

// Check canonical value
const canonMatch = html.match(/<link rel="canonical"[^>]*href="([^"]+)"/);
console.log("Canonical:", canonMatch ? canonMatch[1] : "none");

// Delete test article
const delRes = await fetch(api + "/articles/" + testArticle.id, { method: "DELETE", headers });
console.log("Delete status:", delRes.status);

fs.rmSync(new URL(import.meta.url).pathname);
