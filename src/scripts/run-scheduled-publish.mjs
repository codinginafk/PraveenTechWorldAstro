import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "../..");

const schedulePath = path.join(projectRoot, "src/scripts/publish_schedule.json");
const articlesDir = path.join(projectRoot, "src/content/articles");

if (!fs.existsSync(schedulePath)) {
  console.log("No schedule file found. Exiting.");
  process.exit(0);
}

const rawSchedule = fs.readFileSync(schedulePath, "utf8");
const schedule = JSON.parse(rawSchedule);
const dryRun = process.argv.includes("--dry-run");

const now = new Date();
console.log(`Current Time (UTC): ${now.toISOString()}`);

const remainingSchedule = [];
let changeCount = 0;
const dueEntries = [];

for (const entry of schedule) {
  const publishTime = new Date(entry.publishAt);
  if (Number.isNaN(publishTime.getTime())) {
    console.log(`❌ ERROR: Invalid publishAt for ${entry.file}`);
    remainingSchedule.push(entry);
    continue;
  }
  if (publishTime <= now) {
    const filePath = path.resolve(articlesDir, entry.file);
    const relative = path.relative(articlesDir, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      console.log(`❌ ERROR: Refusing schedule path outside articles directory: ${entry.file}`);
      remainingSchedule.push(entry);
      continue;
    }
    dueEntries.push({ entry, filePath });
  } else {
    console.log(`⏳ PENDING: ${entry.file} (scheduled for ${entry.publishAt})`);
    remainingSchedule.push(entry);
  }
}

if (dueEntries.length > 1 && !dryRun) {
  console.error(`BLOCKED: ${dueEntries.length} scheduled articles are due. The project release policy allows only one live article per session.`);
  for (const { entry } of dueEntries) console.error(` - ${entry.file}`);
  process.exit(2);
}

for (const { entry, filePath } of dueEntries) {
    console.log(`Checking file: ${entry.file} (due at ${entry.publishAt})`);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, "utf8");
      const draftPattern = /^draft:\s*true\s*$/m;
      if (draftPattern.test(content)) {
        if (dryRun) {
          console.log(`📝 DUE (read-only): ${entry.file}`);
        } else {
          content = content.replace(draftPattern, "draft: false");
          fs.writeFileSync(filePath, content, "utf8");
          console.log(`✅ PUBLISHED: Removed draft flag from ${entry.file}`);
          changeCount++;
        }
      } else {
        console.log(`⚠️ ${entry.file} is already published (no draft flag found).`);
      }
    } else {
      console.log(`❌ ERROR: File not found at ${filePath}`);
      remainingSchedule.push(entry);
    }
}

if (!dryRun && changeCount > 0) {
  fs.writeFileSync(schedulePath, JSON.stringify(remainingSchedule, null, 2), "utf8");
  console.log(`Schedule updated. ${remainingSchedule.length} items remaining.`);
} else {
  console.log(dryRun ? "Scheduled publisher dry run complete; no files were changed." : "No scheduled posts are due at this time.");
}
