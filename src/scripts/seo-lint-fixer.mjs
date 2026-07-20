// src/scripts/seo-lint-fixer.mjs
// Purpose: Automatically scans and audits all blog articles for SEO Guru compliance, 
// calculating a performance score and generating a Master Compliance Report.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const REPORTS_DIR = path.join(ROOT_DIR, "research/reports");

// Banned generic filler phrases (Helpful Content triggers)
const BANNED_PHRASES = [
  "in today's digital age",
  "rapidly evolving",
  "delve into",
  "testament to",
  "look no further",
  "game-changer",
  "revolutionary",
  "it is important to note"
];

// First-person indicators (E-E-A-T proof)
const FIRST_PERSON_PRONOUNS = /\b(we|our|my|i|my friends and i|our team|us|ours)\b/i;

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function auditArticle(filePath) {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  
  // Extract body content (after frontmatter)
  const bodyPart = content.split("---").slice(2).join("---").trim();
  const wordCount = bodyPart.split(/\s+/).filter(Boolean).length;
  
  const audit = {
    file: fileName,
    wordCount,
    hasTable: bodyPart.includes("|"),
    hasCodeBlocks: bodyPart.includes("```"),
    codeBlocksWithoutPaths: 0,
    hasFirstPersonHook: false,
    hasBannedPhrases: [],
    h2Count: 0,
    h2sWithBoldAnswers: 0,
    score: 100,
    issues: []
  };

  // 1. Audit Word Count
  if (wordCount < 1000) {
    audit.score -= 20;
    audit.issues.push(`Thin content: only ${wordCount} words (Target 1,000+ words).`);
  }

  // 2. Audit Table/Visual benchmarks for long-form content
  if (wordCount >= 1200 && !audit.hasTable) {
    audit.score -= 15;
    audit.issues.push("Missing comparison table/matrix to display technical stats.");
  }

  // 3. Audit Code Block File Paths
  if (audit.hasCodeBlocks) {
    const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
    let match;
    let blockIndex = 0;
    while ((match = codeBlockRegex.exec(bodyPart)) !== null) {
      blockIndex++;
      const lang = match[1].toLowerCase();
      const code = match[2].trim();
      
      // Skip terminal-only scripts
      if (["bash", "sh", "shell", "powershell", "cmd", "json", "xml"].includes(lang)) continue;

      // Check if line 1 starts with a filepath comment
      const firstLine = code.split("\n")[0] || "";
      const hasPath = firstLine.includes("/") || firstLine.includes("\\") || firstLine.includes(".");
      const hasComment = firstLine.startsWith("//") || firstLine.startsWith("#") || firstLine.startsWith("/*");

      if (!hasPath || !hasComment) {
        audit.codeBlocksWithoutPaths++;
      }
    }

    if (audit.codeBlocksWithoutPaths > 0) {
      audit.score -= (audit.codeBlocksWithoutPaths * 5);
      audit.issues.push(`${audit.codeBlocksWithoutPaths} code block(s) missing explicit file path comments on line 1.`);
    }
  }

  // 4. Audit First-Person Team Narrative Hook (E-E-A-T)
  // Look at the first 3 paragraphs of the body
  const paragraphs = bodyPart.split(/\n\n+/).filter(p => p.trim() && !p.startsWith("#") && !p.startsWith("---"));
  const introBlock = paragraphs.slice(0, 3).join(" ");
  if (FIRST_PERSON_PRONOUNS.test(introBlock)) {
    audit.hasFirstPersonHook = true;
  } else {
    audit.score -= 15;
    audit.issues.push("EEAT Warning: Intro does not establish first-person team experience narrative ('we', 'my workbench', 'our team').");
  }

  // 5. Audit Banned AI Fillers
  for (const phrase of BANNED_PHRASES) {
    if (bodyPart.toLowerCase().includes(phrase)) {
      audit.hasBannedPhrases.push(phrase);
    }
  }
  if (audit.hasBannedPhrases.length > 0) {
    audit.score -= (audit.hasBannedPhrases.length * 5);
    audit.issues.push(`Banned AI filler phrases found: ${audit.hasBannedPhrases.map(p => `"${p}"`).join(", ")}`);
  }

  // 6. Audit GEO Bold Direct Answers under H2s
  let currentH2Line = -1;
  lines.forEach((line, index) => {
    if (line.startsWith("## ")) {
      audit.h2Count++;
      currentH2Line = index;
    } else if (currentH2Line !== -1 && index <= currentH2Line + 3 && line.trim()) {
      // Check if subsequent line contains bold statement (**...**) or blockquote
      const isBold = line.includes("**") || line.startsWith("> **");
      if (isBold) {
        audit.h2sWithBoldAnswers++;
      }
      currentH2Line = -1; // Reset search
    }
  });

  if (audit.h2Count > 0 && audit.h2sWithBoldAnswers < audit.h2Count * 0.5) {
    audit.score -= 10;
    audit.issues.push(`Missing bold direct-answer summaries under H2 headings (${audit.h2sWithBoldAnswers}/${audit.h2Count} H2s have bold answers).`);
  }

  // Enforce score floor
  audit.score = Math.max(0, audit.score);
  return audit;
}

export function runGlobalAudit() {
  console.log("=== Running SEO Compliance Audit ===");
  if (!fs.existsSync(ARTICLES_DIR)) {
    console.error("Articles directory not found: " + ARTICLES_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx"));
  const reports = [];

  for (const file of files) {
    const filePath = path.join(ARTICLES_DIR, file);
    const auditResult = auditArticle(filePath);
    reports.push(auditResult);
  }

  // Sort by lowest score first to highlight issues
  reports.sort((a, b) => a.score - b.score);

  // Generate Report Markdown
  ensureDir(REPORTS_DIR);
  const reportPath = path.join(REPORTS_DIR, "seo-compliance-report.md");
  
  const averageScore = Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length);
  const thinArticles = reports.filter(r => r.wordCount < 1000);
  const missingTables = reports.filter(r => r.wordCount >= 1200 && !r.hasTable);

  const md = [
    "# PraveenTechWorld SEO Compliance Report",
    `**Generated:** ${new Date().toISOString()}`,
    `**Total Articles Audited:** ${reports.length}`,
    `**Average SEO Guru Score:** ${averageScore}/100`,
    `**Thin Articles (<1000 words):** ${thinArticles.length}`,
    `**Articles Missing Tables:** ${missingTables.length}`,
    "",
    "---",
    "",
    "## 🚨 Top Compliance Priorities (Lowest Scores)",
    "",
    reports.slice(0, 10).map(r => {
      const issuesList = r.issues.map(i => `  - ${i}`).join("\n");
      return `### 📄 [${r.file}](file:///C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/${r.file}) (Score: **${r.score}/100**)\n- **Words:** ${r.wordCount}\n- **Issues Identified:**\n${issuesList}\n`;
    }).join("\n"),
    "",
    "---",
    "",
    "## 📊 Complete Scoreboard",
    "",
    "| Score | Article File | Word Count | Table | Code Paths | EEAT Narrative |",
    "|---|---|---|---|---|---|",
    ...reports.map(r => {
      return `| **${r.score}/100** | [${r.file}](file:///C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/${r.file}) | ${r.wordCount} | ${r.hasTable ? "✅ Yes" : "❌ No"} | ${r.codeBlocksWithoutPaths === 0 ? "✅ Yes" : `❌ ${r.codeBlocksWithoutPaths} missing`} | ${r.hasFirstPersonHook ? "✅ Yes" : "❌ No"} |`;
    }),
    "",
    "---",
    "*Auto-generated by SEO Compliance Audit Runner*"
  ].join("\n");

  fs.writeFileSync(reportPath, md, "utf-8");
  console.log(`Audit Complete! Average Score: ${averageScore}/100. Saved report to: ${reportPath}`);
}

// Run CLI
runGlobalAudit();
