import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { google } from "googleapis";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT_DIR, "mission_control.sqlite");

const SITE_URL = "https://www.praveentechworld.com";
const GSC_SITE_URL = "https://www.praveentechworld.com";

// ============================================================================
// 1. HELPERS
// ============================================================================

function getServiceAccountPath() {
  return process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(ROOT_DIR, "gcp-service-account.json");
}

function parsePublishDateAndTitle(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const match = content.match(/^---([\s\S]*?)---/);
    if (!match) return null;
    const yaml = match[1];
    
    const dateMatch = yaml.match(/publishDate:\s*([\d-]+)/);
    const titleMatch = yaml.match(/title:\s*"([^"]+)"|title:\s*'([^']+)'/);
    
    return {
      publishDate: dateMatch ? new Date(dateMatch[1]) : null,
      title: titleMatch ? (titleMatch[1] || titleMatch[2]) : null
    };
  } catch {
    return null;
  }
}

// ============================================================================
// 2. QUERY GOOGLE SEARCH CONSOLE FOR PAGES
// ============================================================================

async function fetchGscPagePerformance(daysBack = 30) {
  const saPath = getServiceAccountPath();
  if (!fs.existsSync(saPath)) {
    console.warn("[GSC Rescheduler] No service account key found at:", saPath);
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: saPath,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    const webmasters = google.webmasters({ version: "v3", auth: await auth.getClient() });

    const startDate = new Date(Date.now() - daysBack * 86400000).toISOString().split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    console.log(`[GSC Rescheduler] Querying page performance from ${startDate} to ${endDate}...`);
    const response = await webmasters.searchanalytics.query({
      siteUrl: GSC_SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: 250,
      },
    });

    return response.data.rows || [];
  } catch (err) {
    console.error("[GSC Rescheduler] GSC API call failed:", err.message);
    return null;
  }
}

// ============================================================================
// 3. AUDIT & RESCHEDULE MAIN ROUTINE
// ============================================================================

async function runAudit() {
  console.log("=== Stale & Low-Performing Post Auditor ===\n");

  const articlesDir = path.join(ROOT_DIR, "src", "content", "articles");
  if (!fs.existsSync(articlesDir)) {
    console.error("Articles directory not found at:", articlesDir);
    return;
  }

  // 1. Get all local articles
  const mdxFiles = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx") || f.endsWith(".md"));
  const localArticles = [];
  
  const now = Date.now();
  const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;

  for (const file of mdxFiles) {
    const filePath = path.join(articlesDir, file);
    const meta = parsePublishDateAndTitle(filePath);
    
    if (meta && meta.publishDate) {
      const age = now - meta.publishDate.getTime();
      const slug = file.replace(/\.mdx?$/, "");
      
      if (age >= fifteenDaysInMs) {
        localArticles.push({
          slug,
          title: meta.title || slug.replace(/-/g, " "),
          publishDate: meta.publishDate,
          ageInDays: Math.floor(age / (1000 * 60 * 60 * 24)),
          filePath
        });
      }
    }
  }

  console.log(`Found ${localArticles.length} articles that are 15+ days old.`);
  if (localArticles.length === 0) return;

  // 2. Fetch page metrics from GSC
  const gscRows = await fetchGscPagePerformance(30) || [];
  const gscData = new Map();
  
  for (const row of gscRows) {
    const pageUrl = row.keys[0]; // e.g. "https://www.praveentechworld.com/articles/my-post"
    const slug = pageUrl.split("/articles/")[1]?.replace(/\/$/, "");
    if (slug) {
      gscData.set(slug, {
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        ctr: row.ctr || 0
      });
    }
  }

  // 3. Match and rank local articles
  const auditedArticles = localArticles.map(art => {
    const performance = gscData.get(art.slug) || { impressions: 0, clicks: 0, ctr: 0 };
    return {
      ...art,
      impressions: performance.impressions,
      clicks: performance.clicks,
      ctr: performance.ctr
    };
  });

  // Sort ascending: lowest impressions first, then lowest clicks
  auditedArticles.sort((a, b) => {
    if (a.impressions !== b.impressions) return a.impressions - b.impressions;
    return a.clicks - b.clicks;
  });

  // Pick the bottom 10
  const bottom10 = auditedArticles.slice(0, 10);
  console.log("\n=== Bottom 10 Performing Articles (15+ Days Old) ===");
  console.table(bottom10.map(a => ({
    Slug: a.slug,
    Age: `${a.ageInDays}d`,
    Impressions: a.impressions,
    Clicks: a.clicks,
    CTR: `${(a.ctr * 100).toFixed(1)}%`
  })));

  // 4. Update the database
  const db = new Database(DB_PATH);
  
  // Make sure schema supports GSC stats logging
  try {
    db.exec("ALTER TABLE artifacts ADD COLUMN impressions INTEGER DEFAULT 0");
    db.exec("ALTER TABLE artifacts ADD COLUMN clicks INTEGER DEFAULT 0");
  } catch {}

  console.log("\n[GSC Rescheduler] Rescheduling bottom 10 articles for rewrite...");
  
  const insertStmt = db.prepare(`
    INSERT INTO artifacts (topic, state, cost_usd_total, impressions, clicks)
    VALUES (?, 'UPDATE_NEEDED', 0, ?, ?)
  `);
  
  const updateStmt = db.prepare(`
    UPDATE artifacts 
    SET state = 'UPDATE_NEEDED', cost_usd_total = 0, impressions = ?, clicks = ?
    WHERE topic = ? OR topic LIKE ?
  `);

  for (const art of bottom10) {
    // Check if the article already exists in the FSM DB
    const existing = db.prepare("SELECT * FROM artifacts WHERE topic = ? OR topic LIKE ?").get(art.title, `%${art.slug}%`);
    
    if (existing) {
      updateStmt.run(art.impressions, art.clicks, existing.topic, `%${art.slug}%`);
      console.log(`  🔄 Reset existing article: "${existing.topic}" -> UPDATE_NEEDED`);
    } else {
      insertStmt.run(art.title, art.impressions, art.clicks);
      console.log(`  🆕 Seeded historical article: "${art.title}" -> UPDATE_NEEDED`);
    }
  }

  console.log("\n=== Audit Complete ===");
}

runAudit().catch(console.error);
