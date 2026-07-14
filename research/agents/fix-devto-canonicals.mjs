import "./lib/shared.mjs";
import fs from "fs";
import path from "path";

const DEVTO_BASE = "https://dev.to/api";
const SITE_URL = "https://www.praveentechworld.com";
const REPORT_FILE = path.resolve(import.meta.dirname, "../research/reports/devto-canonical-fix.json");

async function fetchAllArticles(apiKey) {
  const all = [];
  let page = 1;
  while (true) {
    const url = `${DEVTO_BASE}/articles/me/published?per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: {
        "api-key": apiKey,
        "accept": "application/vnd.forem.api-v1+json",
      },
    });
    if (!res.ok) throw new Error(`Failed to list articles: ${res.status}`);
    const articles = await res.json();
    if (!articles || articles.length === 0) break;
    all.push(...articles);
    page++;
  }
  return all;
}

async function updateArticle(apiKey, id, payload) {
  const res = await fetch(`${DEVTO_BASE}/articles/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
      "accept": "application/vnd.forem.api-v1+json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: err.slice(0, 200) };
  }
  return { ok: true, data: await res.json() };
}

async function main() {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    console.error("No DEVTO_API_KEY in .env");
    process.exit(1);
  }

  console.log("Fetching all published Dev.to articles...");
  const articles = await fetchAllArticles(apiKey);
  console.log(`Found ${articles.length} published articles.`);

  const toFix = articles.filter(
    (a) => a.canonical_url && a.canonical_url.startsWith(SITE_URL)
  );
  console.log(`Found ${toFix.length} articles with praveentechworld.com canonical URLs.`);

  if (toFix.length === 0) {
    console.log("Nothing to fix.");
    return;
  }

  const results = [];
  for (let i = 0; i < toFix.length; i++) {
    const a = toFix[i];
    console.log(`[${i + 1}/${toFix.length}] Updating #${a.id}: "${a.title}" (was: ${a.canonical_url})`);

    const result = await updateArticle(apiKey, a.id, {
      article: { canonical_url: null },
    });

    results.push({
      id: a.id,
      title: a.title,
      slug: a.slug,
      oldCanonical: a.canonical_url,
      success: result.ok,
      ...(result.ok ? {} : { error: result.error }),
    });

    if (result.ok) {
      console.log(`  -> OK. Canonical cleared.`);
    } else {
      console.error(`  -> FAILED (${result.status}): ${result.error}`);
    }

    // Rate limit: 1 request per second
    await new Promise((r) => setTimeout(r, 1100));
  }

  // Write report
  const dir = path.dirname(REPORT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify({
    date: new Date().toISOString(),
    total: articles.length,
    fixed: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  }, null, 2));

  console.log(`\nDone. ${results.filter((r) => r.success).length} updated, ${results.filter((r) => !r.success).length} failed.`);
  console.log(`Report: ${REPORT_FILE}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
