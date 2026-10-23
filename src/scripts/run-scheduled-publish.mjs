import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "../..");

const schedulePath = path.join(projectRoot, "src/scripts/publish_schedule.json");
const articlesDir = path.join(projectRoot, "src/content/articles");
const vercelPath = path.join(projectRoot, "vercel.json");

if (!fs.existsSync(schedulePath)) {
  console.log("No schedule file found. Exiting.");
  process.exit(0);
}

// Load redirects to skip any redirected legacy slugs
let redirects = new Set();
if (fs.existsSync(vercelPath)) {
  try {
    const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
    for (const r of vercel.redirects || []) {
      redirects.add(r.source.replace(/^\/blog\//, "").replace(/\/$/, ""));
    }
  } catch (e) {
    console.error("Warning: could not parse vercel.json redirects:", e.message);
  }
}

const rawSchedule = fs.readFileSync(schedulePath, "utf8");
const schedule = JSON.parse(rawSchedule);
const dryRun = process.argv.includes("--dry-run");

const now = new Date();
console.log(`Current Time (UTC): ${now.toISOString()}`);

const dueEntries = [];
const futureEntries = [];

for (const entry of schedule) {
  const slug = entry.file.replace(/\.mdx$/, "");
  if (redirects.has(slug)) {
    console.log(`🗑️ Removing redirected legacy slug from schedule: ${entry.file}`);
    continue;
  }

  const filePath = path.resolve(articlesDir, entry.file);
  const relative = path.relative(articlesDir, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    console.log(`❌ ERROR: Refusing schedule path outside articles directory: ${entry.file}`);
    continue;
  }

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found, removing from schedule: ${entry.file}`);
    continue;
  }

  const content = fs.readFileSync(filePath, "utf8");
  if (!/^draft:\s*true\s*$/m.test(content)) {
    console.log(`ℹ️ Already published, removing from schedule: ${entry.file}`);
    continue;
  }

  if (/^redirect:\s*/m.test(content) || content.includes('MERGED:') || content.includes('REDIRECTED:')) {
    console.log(`🗑️ Removing merged/redirected draft from schedule: ${entry.file}`);
    continue;
  }

  // Quality Gate: Ensure article is fully complete with valid image before releasing
  const coverMatch = content.match(/^coverImage:\s*["']?(.*?)["']?\s*$/m);
  const imageRel = coverMatch ? coverMatch[1].trim() : null;
  const imagePath = imageRel ? path.join(projectRoot, "public", imageRel.replace(/^[\/\\]/, "")) : null;
  if (!imageRel || !imagePath || !fs.existsSync(imagePath)) {
    console.log(`⚠️ SKIPPING UNREADY DRAFT: ${entry.file} (missing coverImage or asset not found in public/)`);
    futureEntries.push(entry);
    continue;
  }

  if (content.includes('{/* LAB:')) {
    console.log(`⚠️ SKIPPING UNREADY DRAFT: ${entry.file} (contains unresolved lab notes)`);
    futureEntries.push(entry);
    continue;
  }

  const publishTime = new Date(entry.publishAt);
  if (Number.isNaN(publishTime.getTime()) || publishTime <= now) {
    dueEntries.push({ entry, filePath });
  } else {
    futureEntries.push(entry);
  }
}

let changeCount = 0;
const updatedSchedule = [...futureEntries];

if (dueEntries.length === 0) {
  console.log(dryRun ? "Scheduled publisher dry run complete; no files were changed." : "No scheduled posts are due at this time.");
} else {
  // Sort due entries oldest first
  dueEntries.sort((a, b) => new Date(a.entry.publishAt) - new Date(b.entry.publishAt));

  // Enforce STRICT SINGLE-POST LIMIT: publish only the first due article
  const target = dueEntries[0];
  console.log(`🎯 Publishing single due article (Strict Single-Post Limit): ${target.entry.file} (was due at ${target.entry.publishAt})`);

  let content = fs.readFileSync(target.filePath, "utf8");
  const draftPattern = /^draft:\s*true\s*$/m;
  if (draftPattern.test(content)) {
    if (dryRun) {
      console.log(`📝 DUE (read-only): ${target.entry.file}`);
    } else {
      content = content.replace(draftPattern, "draft: false");
      fs.writeFileSync(target.filePath, content, "utf8");
      console.log(`✅ PUBLISHED: Removed draft flag from ${target.entry.file}`);
      changeCount++;
    }
  }

  // If multiple entries were due (e.g. from downtime/delays), reschedule the rest forward safely
  if (dueEntries.length > 1) {
    console.log(`⏰ Rescheduling ${dueEntries.length - 1} remaining overdue articles forward with safe 3-5h gaps...`);
    let rescheduleCursor = new Date(now.getTime());
    for (let i = 1; i < dueEntries.length; i++) {
      const remaining = dueEntries[i].entry;
      const gapMinutes = Math.floor(Math.random() * 90) + 210; // 210-300 mins (3.5 - 5.0 hrs)
      rescheduleCursor = new Date(rescheduleCursor.getTime() + gapMinutes * 60 * 1000);
      remaining.publishAt = rescheduleCursor.toISOString();
      remaining.gapHours = (gapMinutes / 60).toFixed(2);
      console.log(`   ↪ Rescheduled: ${remaining.file} -> ${remaining.publishAt} (+${remaining.gapHours} hrs)`);
      updatedSchedule.push(remaining);
    }
  }
}

// Keep schedule sorted chronologically
updatedSchedule.sort((a, b) => new Date(a.publishAt) - new Date(b.publishAt));

if (!dryRun && (changeCount > 0 || updatedSchedule.length !== schedule.length)) {
  fs.writeFileSync(schedulePath, JSON.stringify(updatedSchedule, null, 2), "utf8");
  console.log(`Schedule updated. ${updatedSchedule.length} items remaining in queue.`);
} else if (dryRun) {
  console.log("Dry run complete; schedule file not modified.");
}
