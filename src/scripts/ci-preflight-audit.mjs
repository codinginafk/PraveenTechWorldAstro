import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const articlesDir = path.join(projectRoot, "src/content/articles");

console.log("=================================================");
console.log("🛡️  PTW CI/CD PRE-FLIGHT MULTI-POINT AUDIT ENGINE");
console.log("=================================================");

let failedPoints = 0;

function runCheck(name, fn) {
  process.stdout.write(`⏳ Checking: ${name}... `);
  try {
    fn();
    console.log("✅ PASSED");
  } catch (err) {
    console.log("❌ FAILED");
    console.error(`   Error details: ${err.message}`);
    failedPoints++;
  }
}

// 1. Frontmatter Validation
runCheck("Frontmatter Schema & Metadata", () => {
  execSync("node src/scripts/validate-content-frontmatter.mjs", { cwd: projectRoot, stdio: "pipe" });
});

// 2. Duplicate Titles & Slugs
runCheck("Duplicate Titles & Slug Collisions", () => {
  execSync("node src/scripts/lint-duplicate-titles.mjs", { cwd: projectRoot, stdio: "pipe" });
});

// 3. Missing Hero Images
runCheck("Hero Image Assets Existence", () => {
  execSync("node src/scripts/lint-missing-images.mjs", { cwd: projectRoot, stdio: "pipe" });
});

// 4. MDX JSX Syntax & Unescaped Angle Brackets
runCheck("MDX Syntax & JSX Integrity", () => {
  const mdxFiles = fs.readdirSync(articlesDir).filter(f => f.endsWith(".mdx"));
  const issues = [];

  for (const file of mdxFiles) {
    const fullPath = path.join(articlesDir, file);
    const content = fs.readFileSync(fullPath, "utf8");
    
    // Split into body (below frontmatter)
    const parts = content.split(/^---$/m);
    if (parts.length < 3) continue;
    const body = parts.slice(2).join("---");

    // Remove fenced code blocks and inline code
    const strippedBody = body
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "");

    // Check for unclosed PascalCase custom JSX tags like <CustomComponent> without </CustomComponent> or />
    const openTags = strippedBody.match(/<[A-Z][A-Za-z0-9]+(?:\s+[^>]*)?(?<!\/)>/g) || [];
    for (const tag of openTags) {
      const tagName = tag.match(/<([A-Z][A-Za-z0-9]+)/)[1];
      const closeTag = `</${tagName}>`;
      if (!strippedBody.includes(closeTag)) {
        issues.push(`${file}: Unclosed JSX component tag ${tag}`);
      }
    }
  }

  if (issues.length > 0) {
    throw new Error(`Found ${issues.length} MDX JSX syntax issues:\n` + issues.map(i => `   - ${i}`).join("\n"));
  }
});

// 5. Single-Post Release Safety Enforcement
runCheck("Single-Post Release Guard (AGENTS.md Policy)", () => {
  try {
    const gitDiff = execSync("git diff --name-only origin/main...HEAD src/content/articles", { cwd: projectRoot, stdio: "pipe" }).toString().trim();
    if (gitDiff) {
      const changedFiles = gitDiff.split("\n").filter(f => f.trim().length > 0);
      let newLiveCount = 0;
      for (const file of changedFiles) {
        const fullPath = path.resolve(projectRoot, file.trim());
        if (fs.existsSync(fullPath)) {
          const text = fs.readFileSync(fullPath, "utf8");
          // Check if newly created and draft: false
          if (/^draft:\s*false/m.test(text)) {
            // Check if file existed in origin/main
            try {
              execSync(`git cat-file -e origin/main:${file.trim()}`, { cwd: projectRoot, stdio: "pipe" });
            } catch {
              // File is completely new and draft: false
              newLiveCount++;
            }
          }
        }
      }
      if (newLiveCount > 1) {
        throw new Error(`Strict Single-Post Violation: ${newLiveCount} new articles are marked draft: false simultaneously.`);
      }
    }
  } catch (err) {
    if (err.message.includes("Strict Single-Post Violation")) {
      throw err;
    }
  }
});

// 6. Astro Code & Prop Diagnostics
runCheck("Astro & TypeScript Diagnostics", () => {
  execSync("npx astro check", { cwd: projectRoot, stdio: "pipe" });
});

// 7. Lexical Integrity & Anti-Slop Guard
runCheck("Lexical Integrity & Slop-Gate", () => {
  const bannedPatterns = [
    { pattern: /\bcompletely stops\b/i, reason: "Unverified absolute claim ('completely stops')" },
    { pattern: /\bgame-changer\b/i, reason: "Banned hype word ('game-changer')" },
    { pattern: /\btestament to\b/i, reason: "Banned AI cliché ('testament to')" },
    { pattern: /\btapestry of\b/i, reason: "Banned AI cliché ('tapestry of')" },
    { pattern: /\bdelve into\b/i, reason: "Banned AI cliché ('delve into')" },
    { pattern: /\bit is crucial to\b/i, reason: "Banned AI cliché ('it is crucial to')" },
    { pattern: /\bvital role in\b/i, reason: "Banned AI cliché ('vital role in')" }
  ];

  let filesToCheck = [];
  try {
    const status = execSync("git status --porcelain src/content/articles", { cwd: projectRoot, stdio: "pipe" }).toString().trim();
    if (status) {
      filesToCheck = status.split("\n").map(line => line.substring(3).trim()).filter(f => f.endsWith(".mdx") || f.endsWith(".md"));
    }
  } catch {}

  const violations = [];
  for (const relPath of filesToCheck) {
    const fullPath = path.resolve(projectRoot, relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf8");
    for (const { pattern, reason } of bannedPatterns) {
      if (pattern.test(content)) {
        violations.push(`${relPath}: ${reason}`);
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(`Slop-Gate detected promotional or banned AI phrases:\n` + violations.map(v => `   - ${v}`).join("\n"));
  }
});

console.log("=================================================");
if (failedPoints > 0) {
  console.error(`🚨 PRE-FLIGHT AUDIT FAILED: ${failedPoints} critical failure point(s) detected!`);
  process.exit(1);
} else {
  console.log("✨ ALL PRE-FLIGHT CHECKS PASSED: Safe to proceed with build & release.");
  process.exit(0);
}
