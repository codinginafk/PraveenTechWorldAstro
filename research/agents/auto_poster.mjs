import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const projectRoot = "C:/Users/bunny/Downloads/00Resume/Building_Tech_Website";
const logPath = path.join(projectRoot, "research/agents/auto_poster.log");

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  fs.appendFileSync(logPath, line, "utf8");
  console.log(line.trim());
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runCmd(cmd) {
  log(`Running command: ${cmd}`);
  try {
    const stdout = execSync(cmd, { cwd: projectRoot, encoding: "utf8" });
    log(`Command success. Output:\n${stdout}`);
    return true;
  } catch (err) {
    log(`Command failed. Error: ${err.message}\nStderr: ${err.stderr}`);
    return false;
  }
}

function publishArticle(fileName) {
  const filePath = path.join(projectRoot, "src/content/articles", fileName);
  log(`Publishing article: ${fileName}`);
  if (!fs.existsSync(filePath)) {
    log(`Error: File not found at ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  if (content.includes("draft: true")) {
    content = content.replace("draft: true", "draft: false");
    fs.writeFileSync(filePath, content, "utf8");
    log(`Successfully changed draft: true -> draft: false in ${fileName}`);
    return true;
  } else {
    log(`Warning: "draft: true" not found in ${fileName}. Already published?`);
    return true;
  }
}

async function main() {
  log("=== AUTO POSTER SCHEDULER DAEMON STARTED ===");

  // 1. Stagger Phase 1: Wait 3 hours
  const waitTime1 = 3 * 3600 * 1000; // 3 hours in ms
  log(`Phase 1: Sleeping for 3 hours (${waitTime1} ms)...`);
  await sleep(waitTime1);

  log("Phase 1: Waking up to publish Docker permissions article.");
  const success1 = publishArticle("docker-volume-permission-denied-fixes.mdx");
  if (success1) {
    runCmd("npm run build");
    runCmd("git add -A");
    runCmd('git commit -m "feat: Release Docker Volume Permissions article (staggered)"');
    runCmd("git push origin main");
  }

  // 2. Stagger Phase 2: Wait 4 hours
  const waitTime2 = 4 * 3600 * 1000; // 4 hours in ms
  log(`Phase 2: Sleeping for 4 hours (${waitTime2} ms)...`);
  await sleep(waitTime2);

  log("Phase 2: Waking up to publish Google Custom Search article.");
  const success2 = publishArticle("how-to-add-google-custom-search-to-website.mdx");
  if (success2) {
    runCmd("npm run build");
    runCmd("git add -A");
    runCmd('git commit -m "feat: Release Google Custom Search article (staggered)"');
    runCmd("git push origin main");
  }

  log("=== AUTO POSTER SCHEDULER DAEMON COMPLETED SUCCESSFULLY ===");
}

main().catch(err => {
  log(`CRITICAL DAEMON ERROR: ${err.message}`);
});
