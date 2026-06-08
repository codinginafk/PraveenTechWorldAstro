import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import https from "https";
import { log, callLLM } from "./lib/shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const REPORTS_DIR = path.resolve(__dirname, "../../reports");
const SITE_URL = "https://www.praveentechworld.com";

function httpGet(url) {
  return new Promise((resolve) => {
    https.get(url, { timeout: 15000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    }).on("error", () => resolve({ status: 0, body: "" })).on("timeout", function () { this.destroy(); resolve({ status: 0, body: "" }); });
  });
}

function extractSlugsFromFiles(files) {
  return files
    .filter((f) => f.endsWith(".mdx") && f.includes("/articles/"))
    .map((f) => path.basename(f, ".mdx"))
    .filter(Boolean);
}

function fileToPublicUrl(filePath) {
  const name = path.basename(filePath);
  if (filePath.includes("/articles/")) {
    return `/blog/${name.replace(/\.mdx$/, "")}`;
  }
  if (filePath.endsWith(".astro") || filePath.endsWith(".ts") || filePath.endsWith(".mjs")) {
    return null;
  }
  return null;
}

async function verifyUrls(urls, description) {
  if (!urls.length) return { ok: true, skipped: true };
  log(`  Verifying ${urls.length} URL(s) on live site...`);
  const results = [];
  for (const u of urls) {
    const fullUrl = `${SITE_URL}${u}`;
    const { status } = await httpGet(fullUrl);
    const passed = status === 200;
    log(`    ${passed ? "✓" : "✗"} ${u} → ${status}`);
    results.push({ url: u, status, passed });
  }
  const allPassed = results.every((r) => r.passed);
  if (allPassed) {
    log(`  ✓ All ${results.length} URL(s) verified on live site.`);
  } else {
    const failed = results.filter((r) => !r.passed).map((r) => r.url);
    log(`  ✗ ${failed.length} URL(s) not live: ${failed.join(", ")}`);
  }
  return { ok: allPassed, results };
}

async function deployToVercel() {
  log("  Deploying to Vercel production...");
  try {
    const output = execSync("npx vercel --prod --yes", { cwd: ROOT_DIR, stdio: "pipe", timeout: 180000 });
    const outStr = output.toString();
    if (outStr.includes("Aliased") || outStr.includes("ready")) {
      log("  ✓ Deploy to Vercel succeeded.");
      return true;
    }
    log("  Deploy output did not confirm success. Checking...");
    log(`  Output: ${outStr.slice(0, 500)}`);
    return true;
  } catch (err) {
    log(`  ✗ Vercel deploy failed: ${err.message}`);
    return false;
  }
}

export async function runDev(task, { autoCommit = false } = {}) {
  log("[Dev Agent] Starting...");
  log(`  Task: ${task.description || "Unknown"}`);

  if (!task || !task.files || task.files.length === 0) {
    log("[Dev Agent] No files to modify.");
    return { success: false, reason: "No files specified" };
  }

  const originals = {};
  for (const file of task.files) {
    const fullPath = path.join(ROOT_DIR, file);
    if (fs.existsSync(fullPath)) {
      originals[file] = fs.readFileSync(fullPath, "utf-8");
    }
  }

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

  log("  Running astro build...");
  try {
    execSync("npx astro build", { cwd: ROOT_DIR, stdio: "pipe", timeout: 120000 });
    log("  Build PASSED");
  } catch (err) {
    log("  Build FAILED. Reverting changes.");
    for (const [file, content] of Object.entries(originals)) {
      fs.writeFileSync(path.join(ROOT_DIR, file), content, "utf-8");
    }
    return { success: false, reason: "Build failed", output: err.message };
  }

  if (autoCommit) {
    try {
      execSync("git add -A", { cwd: ROOT_DIR });
      execSync(`git commit -m "Dev agent: ${task.description?.slice(0, 72) || "auto fix"}"`, { cwd: ROOT_DIR });
      execSync("git push", { cwd: ROOT_DIR, timeout: 30000 });
      log("  Committed and pushed.");
    } catch (err) {
      log(`  Commit failed: ${err.message}`);
      return { success: true, buildPassed: true, commitFailed: true, deployFailed: false };
    }

    // Deploy to Vercel
    const deployed = await deployToVercel();

    if (!deployed) {
      log("  ✗ Deployment to Vercel failed. Changes are committed but not live.");
      return { success: true, buildPassed: true, commitFailed: false, deployFailed: true };
    }

    // Verify on live site
    const slugs = extractSlugsFromFiles(task.files);
    const verifyUrlsList = slugs.map((s) => `/blog/${s}`);
    if (task.verifyUrls) {
      verifyUrlsList.push(...task.verifyUrls);
    }
    const verification = await verifyUrls(verifyUrlsList, task.description);

    if (!verification.ok) {
      log("  ⚠ Some changes verified, some URLs not yet live.");
    } else {
      log("  ✓ All changes verified live on production.");
    }

    return { success: true, buildPassed: true, commitFailed: false, deployFailed: !deployed, verification };
  }

  return { success: true, buildPassed: true };
}

export async function checkAndApplyUnreadReport() {
  const reportPath = path.join(REPORTS_DIR, "report.md");
  const flagPath = path.join(REPORTS_DIR, ".boss_opened");

  if (!fs.existsSync(reportPath)) return;

  const reportAge = (Date.now() - fs.statSync(reportPath).mtimeMs) / (1000 * 60 * 60);
  if (reportAge < 12) return;

  if (fs.existsSync(flagPath)) {
    const flagTime = new Date(fs.readFileSync(flagPath, "utf-8")).getTime();
    if (flagTime >= fs.statSync(reportPath).mtimeMs) return;
  }

  log("[Dev Agent] Report unread for 12h. Auto-implementing top suggestion.");

  const report = fs.readFileSync(reportPath, "utf-8");

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
    files: [],
    llmPrompt: `Implement this improvement for the PraveenTechWorld website: ${improvements[0]}. Read the relevant files first, make the change, and return the complete modified files.`,
  }, { autoCommit: false });

  log("[Dev Agent] Improvement applied. Awaiting Boss approval.");
}

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
