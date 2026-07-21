/**
 * Blogger Bulk Backfill Script
 * Publishes all articles NOT yet on Blogger, up to the daily rate limit (3/day).
 * Run once per day: node scratch/blogger-backfill.mjs
 * 
 * It reads state.json → bloggerPostLog to know which slugs are already published.
 * Respects the MAX_DAILY_POSTS=3 limit inside syndicate-blogger.mjs automatically.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "src/content/articles");
const STATE_FILE = path.join(ROOT, "research/agents/state.json");
const BLOGGER_MODULE = path.join(ROOT, "research/agents/lib/syndicate-blogger.mjs");

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")); }
  catch { return {}; }
}

async function main() {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  BLOGGER BULK BACKFILL — PraveenTechWorld");
  console.log("═══════════════════════════════════════════════\n");

  if (!fs.existsSync(ARTICLES_DIR)) {
    console.error("  ✗ Articles directory not found:", ARTICLES_DIR);
    process.exit(1);
  }

  const { generateBloggerPostForArticle, publishToBlogger } = await import(BLOGGER_MODULE);

  const state = loadState();
  const alreadyPosted = new Set(
    (state.bloggerPostLog || [])
      .filter(p => p.status === "published")
      .map(p => p.slug)
  );

  const allFiles = fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith(".mdx"))
    .sort(); // alphabetical = chronological slug order

  const pending = allFiles.filter(f => !alreadyPosted.has(path.basename(f, ".mdx")));
  const total = allFiles.length;
  const done = allFiles.length - pending.length;

  console.log(`  Total articles:    ${total}`);
  console.log(`  Already on Blogger: ${done}`);
  console.log(`  Pending to publish: ${pending.length}`);
  console.log(`  Daily limit:        3 posts/day`);
  console.log("\n  Starting publication run...\n");

  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (const file of pending) {
    const slug = path.basename(file, ".mdx");
    const filePath = path.join(ARTICLES_DIR, file);

    process.stdout.write(`  → ${slug.slice(0, 60).padEnd(62)} `);

    const post = generateBloggerPostForArticle(filePath);
    if (!post) {
      console.log("✗ Parse failed");
      failed++;
      continue;
    }

    const result = await publishToBlogger(post);

    if (result) {
      console.log(`✓ ${result.postUrl}`);
      published++;
    } else {
      // Check if it was the daily limit that stopped us
      const freshState = loadState();
      const today = new Date().toISOString().slice(0, 10);
      const dailyCount = freshState.bloggerPostDate === today ? (freshState.bloggerDailyCount || 0) : 0;
      if (dailyCount >= 3) {
        console.log("⏸  Daily limit reached (3/day). Run again tomorrow.");
        skipped = pending.indexOf(file);
        break;
      }
      console.log("✗ Failed (see state.json bloggerPostLog for details)");
      failed++;
    }

    // Polite delay between posts to avoid API rate limiting
    await new Promise(r => setTimeout(r, 4000));
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log(`  Run complete:`);
  console.log(`    Published this run: ${published}`);
  console.log(`    Failed:             ${failed}`);
  console.log(`    Remaining:          ${pending.length - published - failed}`);
  console.log("  Run again tomorrow to continue backfilling.");
  console.log("═══════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error("\n  ✗ Fatal error:", err.message);
  process.exit(1);
});
