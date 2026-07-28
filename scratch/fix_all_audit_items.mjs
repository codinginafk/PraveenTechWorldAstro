import fs from "fs";
import path from "path";

const articlesDir = "src/content/articles";

console.log("=== FIXING ALL REPORTED AUDIT ITEMS ===");

// 1. Fix docker-desktop-licensing-changes.mdx long H2
const dockerFile = path.join(articlesDir, "docker-desktop-licensing-changes.mdx");
if (fs.existsSync(dockerFile)) {
  let content = fs.readFileSync(dockerFile, "utf8");
  content = content.replace(
    /## 1\. Docker's updated licensing terms for large enterprises have forced many engineering teams to re-evaluate their local container strategy\. While personal and small-team use of Docker Desktop remains free, organizations exceeding 250 employees or \$10 million in annual revenue must purchase paid subscriptions\. For a development team of 120 users, this licensing overhead translates to a recurring annual expense that is difficult to justify when open-source alternatives exist\./,
    "## 1. Enterprise Docker Licensing Changes\n\nDocker's updated licensing terms for large enterprises have forced many engineering teams to re-evaluate their local container strategy. While personal and small-team use of Docker Desktop remains free, organizations exceeding 250 employees or $10 million in annual revenue must purchase paid subscriptions. For a development team of 120 users, this licensing overhead translates to a recurring annual expense that is difficult to justify when open-source alternatives exist."
  );
  fs.writeFileSync(dockerFile, content, "utf8");
  console.log("✅ Fixed long H2 in docker-desktop-licensing-changes.mdx");
}

// 2. Fix how-deepseek-orchestration-logs-improve-cloud-operations-2026.mdx long H2
const dsLogsFile = path.join(articlesDir, "how-deepseek-orchestration-logs-improve-cloud-operations-2026.mdx");
if (fs.existsSync(dsLogsFile)) {
  let content = fs.readFileSync(dsLogsFile, "utf8");
  content = content.replace(
    /## 2\. Running AI models unsupervised sounds like a dream for enterprise IT teams—until you try to hook them up to your live cloud infrastructure\. Over the past 30 days, I let DeepSeek run autonomously in our environment to orchestrate cloud operations\./,
    "## 1. Running DeepSeek Unsupervised in Production\n\nRunning AI models unsupervised sounds like a dream for enterprise IT teams—until you try to hook them up to your live cloud infrastructure. Over the past 30 days, I let DeepSeek run autonomously in our environment to orchestrate cloud operations."
  );
  fs.writeFileSync(dsLogsFile, content, "utf8");
  console.log("✅ Fixed long H2 in how-deepseek-orchestration-logs-improve-cloud-operations-2026.mdx");
}

// 3. Trim Meta Descriptions > 150 chars across all MDX articles & pages
const pagesDir = "src/pages";

function trimDescriptions(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      trimDescriptions(fullPath);
    } else if (file.endsWith(".mdx") || file.endsWith(".astro")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let modified = false;

      // Match description in frontmatter or SEO props
      content = content.replace(/(description:\s*")([^"]+)(")/g, (match, p1, p2, p3) => {
        if (p2.length > 150) {
          modified = true;
          // Trim to ~145 chars at word boundary
          let trimmed = p2.slice(0, 145);
          const lastSpace = trimmed.lastIndexOf(" ");
          if (lastSpace > 110) trimmed = trimmed.slice(0, lastSpace);
          console.log(`✂️ Trimmed description (${p2.length} -> ${trimmed.length} chars) in ${file}`);
          return `${p1}${trimmed}${p3}`;
        }
        return match;
      });

      if (modified) {
        fs.writeFileSync(fullPath, content, "utf8");
      }
    }
  }
}

trimDescriptions(articlesDir);
trimDescriptions(pagesDir);

// 4. Shorten H1 titles > 70 chars in MDX frontmatter
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));
for (const file of files) {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  content = content.replace(/(title:\s*")([^"]+)(")/g, (match, p1, p2, p3) => {
    if (p2.length > 70) {
      modified = true;
      // Replacements for known long titles
      let shortTitle = p2;
      if (p2.includes("Step-by-Step Local SEO Guide for Dubai Small Businesses")) {
        shortTitle = "Local SEO Guide for Dubai Businesses (Bur Dubai Case Study)";
      } else if (p2.includes("Will Factory Resetting Windows Fix a Corrupted User Profile?")) {
        shortTitle = "Will Factory Resetting Windows Fix a Corrupted User Profile?";
      } else if (p2.includes("GPO Sprawl Cleanup Script: Audit Unlinked Group Policies")) {
        shortTitle = "GPO Sprawl Cleanup Script: Audit Unlinked Group Policies";
      } else if (p2.includes("Building a CLI Tool to Automate Spreadsheet Data Cleaning")) {
        shortTitle = "CLI Tool to Automate Spreadsheet Data Cleaning with DeepSeek";
      } else if (p2.includes("DEBULL Tooling Abuses Microsoft Device-Code Flow")) {
        shortTitle = "DEBULL Tooling Abuses Device-Code Flow to Target M365";
      } else if (p2.includes("Automate Weekly Student Grade Reports with a Python Script")) {
        shortTitle = "Automate Student Grade Reports with Python & DeepSeek";
      } else if (p2.includes("AI-Powered Expense Report Automation for Office Workers")) {
        shortTitle = "AI Expense Report Automation for Office Workers (No-Code)";
      } else {
        shortTitle = p2.slice(0, 65).trim();
      }
      console.log(`🏷️ Shortened H1 Title (${p2.length} -> ${shortTitle.length} chars) in ${file}`);
      return `${p1}${shortTitle}${p3}`;
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

// 5. Shorten image alt text > 80 chars in MDX articles
for (const file of files) {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  content = content.replace(/!\[([^\]]{81,})\]\(([^)]+)\)/g, (match, p1, p2) => {
    let shortAlt = p1.slice(0, 75).trim() + "...";
    const lastSpace = shortAlt.lastIndexOf(" ");
    if (lastSpace > 50) shortAlt = p1.slice(0, lastSpace);
    console.log(`🖼️ Shortened Alt Text (${p1.length} -> ${shortAlt.length} chars) in ${file}`);
    modified = true;
    return `![${shortAlt}](${p2})`;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

console.log("\nCompleted fixing all reported audit items.");
