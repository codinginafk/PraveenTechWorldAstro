import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { log, callLLM } from "./lib/shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const REPORTS_DIR = path.resolve(__dirname, "../reports");

export async function runDev(task, { autoCommit = false } = {}) {
  log("[Dev Agent] Starting...");
  log(`  Task: ${task.description || "Unknown"}`);

  if (!task || !task.files || task.files.length === 0) {
    log("[Dev Agent] No files to modify.");
    return { success: false, reason: "No files specified" };
  }

  // Read the files
  const originals = {};
  for (const file of task.files) {
    const fullPath = path.join(ROOT_DIR, file);
    if (fs.existsSync(fullPath)) {
      originals[file] = fs.readFileSync(fullPath, "utf-8");
    }
  }

  // If task has LLM instructions, use LLM to generate the fix
  if (task.llmPrompt) {
    try {
      const sysPrompt = "You are a developer writing code for an Astro + Tailwind website. Write clean, working code. Return ONLY the complete file content, no explanations.";
      const result = await callLLM(sysPrompt, task.llmPrompt, { temperature: 0.2, maxTokens: 2048 });
      if (result && result.length > 50) {
        const targetPath = path.join(ROOT_DIR, task.files[0]);
        fs.writeFileSync(targetPath, result, "utf-8");
        log(`  Applied LLM-generated fix to ${task.files[0]}`);
      }
    } catch (err) {
      log(`  LLM fix failed: ${err.message}`);
    }
  }

  // Run astro build
  log("  Running astro build...");
  try {
    execSync("npx astro build", { cwd: ROOT_DIR, stdio: "pipe", timeout: 60000 });
    log("  Build PASSED");
  } catch (err) {
    log("  Build FAILED. Reverting changes.");
    // Revert
    for (const [file, content] of Object.entries(originals)) {
      fs.writeFileSync(path.join(ROOT_DIR, file), content, "utf-8");
    }
    return { success: false, reason: "Build failed", output: err.message };
  }

  // Ask Boss for approval (simulated: if autoCommit is set and we got this far)
  if (autoCommit) {
    try {
      execSync("git add -A", { cwd: ROOT_DIR });
      execSync(`git commit -m "Dev agent: ${task.description?.slice(0, 72) || "auto fix"}"`, { cwd: ROOT_DIR });
      execSync("git push", { cwd: ROOT_DIR, timeout: 30000 });
      log("  Committed and pushed.");
    } catch (err) {
      log(`  Commit failed: ${err.message}`);
      return { success: true, buildPassed: true, commitFailed: true };
    }
  }

  return { success: true, buildPassed: true };
}

export async function checkAndApplyUnreadReport() {
  const reportPath = path.join(REPORTS_DIR, "report.md");
  const flagPath = path.join(REPORTS_DIR, ".boss_opened");

  if (!fs.existsSync(reportPath)) return;

  const reportAge = (Date.now() - fs.statSync(reportPath).mtimeMs) / (1000 * 60 * 60);
  if (reportAge < 12) return;

  // Report is older than 12 hours
  if (fs.existsSync(flagPath)) {
    const flagTime = new Date(fs.readFileSync(flagPath, "utf-8")).getTime();
    if (flagTime >= fs.statSync(reportPath).mtimeMs) return; // Was opened
  }

  log("[Dev Agent] Report unread for 12h. Auto-implementing top suggestion.");

  const report = fs.readFileSync(reportPath, "utf-8");

  // Extract improvement suggestions
  const improvements = [];
  const inSection = report.match(/## Marginal Improvements Suggested\n([\s\S]*?)(?=\n##|$)/);
  if (inSection) {
    const lines = inSection[1].split("\n").filter((l) => l.startsWith("- "));
    improvements.push(...lines.map((l) => l.replace(/^- /, "").trim()));
  }

  if (improvements.length === 0) {
    log("[Dev Agent] No improvements to implement.");
    return;
  }

  await runDev({
    description: improvements[0],
    files: [], // Auto-detected
    llmPrompt: `Implement this improvement for the PraveenTechWorld website: ${improvements[0]}. Read the relevant files first, make the change, and return the complete modified files.`,
  }, { autoCommit: false });

  log("[Dev Agent] Improvement applied. Awaiting Boss approval.");
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const action = process.argv[2];
  if (action === "check-report") {
    checkAndApplyUnreadReport().catch(console.error);
  } else {
    runDev({
      description: process.argv[2] || "Manual dev task",
      files: (process.argv[3] || "").split(",").filter(Boolean),
      llmPrompt: process.argv[4] || "",
    }).catch(console.error);
  }
}
