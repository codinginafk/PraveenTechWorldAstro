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

const now = new Date();
console.log(`Current Time (UTC): ${now.toISOString()}`);

const remainingSchedule = [];
let changeCount = 0;

for (const entry of schedule) {
  const publishTime = new Date(entry.publishAt);
  if (publishTime <= now) {
    const filePath = path.join(articlesDir, entry.file);
    console.log(`Checking file: ${entry.file} (due at ${entry.publishAt})`);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, "utf8");
      if (content.includes("draft: true")) {
        content = content.replace("draft: true", "draft: false");
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`✅ PUBLISHED: Removed draft flag from ${entry.file}`);
        changeCount++;
      } else {
        console.log(`⚠️ ${entry.file} is already published (no draft flag found).`);
      }
    } else {
      console.log(`❌ ERROR: File not found at ${filePath}`);
    }
  } else {
    console.log(`⏳ PENDING: ${entry.file} (scheduled for ${entry.publishAt})`);
    remainingSchedule.push(entry);
  }
}

if (changeCount > 0) {
  fs.writeFileSync(schedulePath, JSON.stringify(remainingSchedule, null, 2), "utf8");
  console.log(`Schedule updated. ${remainingSchedule.length} items remaining.`);
} else {
  console.log("No scheduled posts are due at this time.");
}
