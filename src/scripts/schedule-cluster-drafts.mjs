import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "../..");

const draftsDir = path.join(projectRoot, "research/agents/drafts");
const articlesDir = path.join(projectRoot, "src/content/articles");
const schedulePath = path.join(projectRoot, "src/scripts/publish_schedule.json");

const draftMap = [
  {
    draftFile: "open-webui-ollama-rag-it-runbooks-setup.mdx",
    coverImage: "/images/generated/open-webui-ollama-rag.jpg",
    staggerMinutes: 75, // 1 hr 15 mins
  },
  {
    draftFile: "shadow-ai-audit-microsoft-365-native-tools.mdx",
    coverImage: "/images/generated/shadow-ai-m365-audit.jpg",
    staggerMinutes: 165, // 2 hrs 45 mins
  },
  {
    draftFile: "indirect-prompt-injection-attack-scenario-guide.mdx",
    coverImage: "/images/generated/indirect-prompt-injection.jpg",
    staggerMinutes: 255, // 4 hrs 15 mins
  }
];

const now = new Date();
const schedule = [];

console.log("=== Scheduling Cluster Drafts for Staggered Release ===");

for (const item of draftMap) {
  const draftPath = path.join(draftsDir, item.draftFile);
  const targetPath = path.join(articlesDir, item.draftFile);

  if (!fs.existsSync(draftPath)) {
    console.error(`Missing draft file: ${item.draftFile}`);
    continue;
  }

  let content = fs.readFileSync(draftPath, "utf8");

  // Update coverImage path
  content = content.replace(/coverImage:\s*"[^"]+"/, `coverImage: "${item.coverImage}"`);

  // Ensure draft: true is present
  if (!content.includes("draft: true")) {
    content = content.replace(/^---\n/, "---\ndraft: true\n");
  }

  // Calculate publishAt date
  const publishDateObj = new Date(now.getTime() + item.staggerMinutes * 60 * 1000);
  const publishAtISO = publishDateObj.toISOString();

  // Update publishDate in frontmatter to YYYY-MM-DD
  const dateStr = publishDateObj.toISOString().split("T")[0];
  content = content.replace(/publishDate:\s*"[^"]+"/, `publishDate: "${dateStr}"`);

  // Write to src/content/articles/
  fs.writeFileSync(targetPath, content, "utf8");
  console.log(`✅ Prepped & Staged: ${item.draftFile} (Target cover: ${item.coverImage})`);

  schedule.push({
    file: item.draftFile,
    publishAt: publishAtISO,
    title: item.draftFile.replace(".mdx", "")
  });
}

// Save schedule
fs.writeFileSync(schedulePath, JSON.stringify(schedule, null, 2), "utf8");
console.log(`\n🎉 Schedule successfully updated! ${schedule.length} articles queued in ${schedulePath}`);
schedule.forEach((s, i) => console.log(`  [${i + 1}] ${s.file} -> Due at: ${s.publishAt}`));
