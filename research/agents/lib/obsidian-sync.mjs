import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../..");

const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const VAULT_DIR = path.join(ROOT_DIR, "research/vault");
const PUBLISHED_DIR = path.join(VAULT_DIR, "Published");
const SOCIAL_DIR = path.join(VAULT_DIR, "Social-Hooks");
const TOPICS_DIR = path.join(VAULT_DIR, "Topics");

export function syncObsidianVault() {
  console.log("=== Syncing Astro Articles to Obsidian Vault ===");

  if (!fs.existsSync(ARTICLES_DIR)) {
    console.error("Articles directory not found:", ARTICLES_DIR);
    return;
  }

  // Ensure directories exist
  [PUBLISHED_DIR, SOCIAL_DIR, TOPICS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"));
  let newNotesCount = 0;

  for (const f of files) {
    const slug = f.replace(/\.mdx$/, "");
    const mdxPath = path.join(ARTICLES_DIR, f);
    const publishedPath = path.join(PUBLISHED_DIR, `${slug}.md`);

    if (fs.existsSync(publishedPath)) continue;

    try {
      const content = fs.readFileSync(mdxPath, "utf-8");
      
      // Parse frontmatter basic properties
      const titleMatch = content.match(/^title:\s*"(.+?)"/m) || content.match(/^title:\s*(.+)/m);
      const title = (titleMatch?.[1] || slug).replace(/"/g, "");

      const descMatch = content.match(/^description:\s*"(.+?)"/m) || content.match(/^description:\s*(.+)/m);
      const description = (descMatch?.[1] || "").replace(/"/g, "");

      const catMatch = content.match(/^category:\s*(.+)/m) || content.match(/^pillarId:\s*(.+)/m);
      const category = (catMatch?.[1] || "website-setup").trim().replace(/"/g, "");

      const dateMatch = content.match(/^publishDate:\s*(.+)/m);
      const publishDate = (dateMatch?.[1] || new Date().toISOString().split("T")[0]).trim();

      const coverMatch = content.match(/^coverImage:\s*"(.+?)"/m) || content.match(/^coverImage:\s*(.+)/m);
      const coverImage = coverMatch?.[1] || "";

      // Write standard Obsidian markdown note
      const noteContent = `---
title: "${title}"
description: "${description}"
category: ${category}
publishDate: ${publishDate}
coverImage: "${coverImage}"
status: published
topic: "[[Topics/${slug}]]"
social: "[[Social-Hooks/${slug}-social]]"
---

# 🚀 Published: ${title}

## Summary
> ${description}

---
- **Category Guide:** [[Topics/${category}]]
- **Social Hooks:** [[Social-Hooks/${slug}-social]]
- **Astro Source File:** \`src/content/articles/${slug}.mdx\`
`;
      fs.writeFileSync(publishedPath, noteContent, "utf-8");

      // Generate corresponding social hook placeholder if missing
      const socialFilePath = path.join(SOCIAL_DIR, `${slug}-social.md`);
      if (!fs.existsSync(socialFilePath)) {
        const socialContent = `# 🔗 Social Media Hooks: ${title}

## 👥 LinkedIn Post
*Syncing marketing data...*

## 🐦 X / Twitter Hook
*Syncing marketing data...*

---
Backlink: [[Published/${slug}]]
`;
        fs.writeFileSync(socialFilePath, socialContent, "utf-8");
      }

      newNotesCount++;
    } catch (err) {
      console.error(`Failed to sync article ${f}:`, err.message);
    }
  }

  console.log(`Sync complete. Created ${newNotesCount} new notes in vault/Published/.`);

  // Update dashboard stats
  updateDashboardStats();
}

function updateDashboardStats() {
  const dashboardPath = path.join(VAULT_DIR, "Dashboard.md");
  if (!fs.existsSync(dashboardPath)) return;

  try {
    let dashboardContent = fs.readFileSync(dashboardPath, "utf-8");
    const totalPublished = fs.readdirSync(PUBLISHED_DIR).filter(f => f.endsWith(".md") && f !== ".gitkeep").length;

    // Update stats line
    dashboardContent = dashboardContent.replace(
      /- \*\*Daily Article Quota:\*\* .+/m,
      `- **Daily Article Quota:** 3 Posts / Day\n- **Total Published Articles:** ${totalPublished} notes`
    );

    fs.writeFileSync(dashboardPath, dashboardContent, "utf-8");
    console.log(`Updated Dashboard stats: ${totalPublished} total published articles.`);
  } catch (err) {
    console.error("Failed to update dashboard stats:", err.message);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncObsidianVault();
}
