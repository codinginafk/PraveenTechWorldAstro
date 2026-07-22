import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { AUTO_TARGETS, AUTHOR_NAME, AUTHOR_TITLE, SITE_URL } from "./targets.mjs";

const ARTICLES_DIR = path.resolve(import.meta.dirname, "../../../src/content/articles");
const SUBMITTED_LOG = path.resolve(import.meta.dirname, "auto-submitted.json");

function loadSubmitted() {
  try { return JSON.parse(fs.readFileSync(SUBMITTED_LOG, "utf-8")); }
  catch { return {}; }
}

function saveSubmitted(data) {
  fs.writeFileSync(SUBMITTED_LOG, JSON.stringify(data, null, 2), "utf-8");
}

function getArticleContent(slug) {
  const filePath = path.join(ARTICLES_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const parts = raw.split(/^---\n/m);
  if (parts.length < 3) return null;
  const body = parts[2].trim();
  const title = raw.match(/^title:\s*"(.*?)"/m)?.[1] || slug;
  const category = raw.match(/^category:\s*(\S+)/m)?.[1] || "";
  return {
    title,
    body,
    category,
  };
}

// Pick a good article for each site
function pickArticle(target) {
  const slugs = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx")).sort().reverse();
  const nicheMap = {
    "windows-it": ["windows", "fix", "update", "troubleshoot"],
    ai: ["deepseek", "ai", "agent", "llm"],
    tech: ["guide", "how-to", "fix", "setup", "automate"],
    dev: ["docker", "cli", "script", "build"],
  };
  const keywords = nicheMap[target.niche] || ["guide", "how-to"];

  // Pick newest article matching keywords
  for (const slug of slugs) {
    const base = slug.replace(".mdx", "");
    if (keywords.some(k => base.includes(k))) {
      return base;
    }
  }
  return slugs[0].replace(".mdx", "");
}

async function submitNYComputerHelp(page, article) {
  await page.goto("https://newyorkcomputerhelp.com/write-for-us/");
  await page.waitForTimeout(3000);
  // Gravity Forms — fill name, email, upload article as text file
  const names = article.title.split(" ");
  await page.fill("#input_14_1_3", names[0] || AUTHOR_NAME);
  await page.fill("#input_14_1_6", names.slice(1).join(" ") || "Guest Post");
  await page.fill("#input_14_3", process.env.OUTREACH_EMAIL || "youngbro405@gmail.com");
  // Create a text file with article content
  const tmpFile = path.join(import.meta.dirname, "temp-article.txt");
  fs.writeFileSync(tmpFile, article.body.slice(0, 5000), "utf-8");
  await page.setInputFiles("#input_14_6", tmpFile);
  // Check "Email" notification preference
  await page.check("#choice_14_8_1");
  // Click submit
  await page.click("#gform_submit_button_14");
  await page.waitForTimeout(5000);
  fs.rmSync(tmpFile, { force: true });
  console.log("  Submitted to New York Computer Help");
}

async function submitTechUniverses(page, article) {
  await page.goto("https://www.techuniverses.com/write-for-us-technology/");
  await page.waitForTimeout(3000);
  await page.fill('input[name="your-name"]', AUTHOR_NAME);
  await page.fill('input[name="your-email"]', process.env.OUTREACH_EMAIL || "youngbro405@gmail.com");
  await page.fill('input[name="your-subject"]', `Guest Post: ${article.title}`);
  await page.fill('textarea[name="your-message"]', article.body.slice(0, 3000));
  await page.click('input[type="submit"]');
  await page.waitForTimeout(5000);
  console.log("  Submitted to Tech Universes");
}

async function submitTechyDialogue(page, article) {
  console.log("  SKIP — Techy Dialogue requires account registration (not direct form)");
}

async function submitSentiSight(page, article) {
  await page.goto("https://www.sentisight.ai/write-for-us/");
  await page.waitForTimeout(3000);
  await page.fill('input[name="full-name"]', AUTHOR_NAME);
  await page.fill('input[name="email"]', process.env.OUTREACH_EMAIL || "youngbro405@gmail.com");
  await page.fill('input[name="company"]', "PraveenTechWorld");
  await page.fill('textarea[name="your-message"]', `Guest Post: ${article.title}\n\n${article.body.slice(0, 3000)}`);
  // Use JS to bypass consent checkbox + submit
  await page.evaluate(() => {
    const cb = document.querySelector('input[name="your-consent"]');
    if (cb) cb.checked = true;
    const btn = document.querySelector('input[type="submit"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(5000);
  console.log("  Submitted to SentiSight AI");
}

async function submitSetproduct(page, article) {
  console.log("  SKIP — Setproduct uses email capture form, not guest post submission");
}

async function submitNovu(page, article) {
  console.log("  SKIP — Novu Handbook form is JS-rendered, needs manual inspection");
}

async function submitLogicSpice(page, article) {
  await page.goto("https://www.logicspice.com/submit-guest-post");
  await page.waitForTimeout(2000);
  await page.fill('input[name*="name"]', AUTHOR_NAME);
  await page.fill('input[name*="email"]', process.env.OUTREACH_EMAIL || "youngbro405@gmail.com");
  await page.fill('textarea', article.body.slice(0, 2000));
  const submit = await page.$('button[type="submit"], input[type="submit"]');
  if (submit) await submit.click();
  await page.waitForTimeout(3000);
  console.log("  Submitted to LogicSpice");
}

async function submitTechLabari(page, article) {
  console.log("  SKIP — Tech Labari only has login form, no article submission");
}

const SUBMITTERS = {
  "New York Computer Help": submitNYComputerHelp,
  "Tech Universes": submitTechUniverses,
  "Techy Dialogue": submitTechyDialogue,
  "SentiSight AI": submitSentiSight,
  "Setproduct": submitSetproduct,
  "Novu Handbook": submitNovu,
  "LogicSpice": submitLogicSpice,
  "Tech Labari": submitTechLabari,
};

export async function runAutoSubmits(dryRun = false) {
  console.log("=== AUTO Site Submission ===\n");
  const submitted = loadSubmitted();
  const browser = dryRun ? null : await chromium.launch({ headless: true });

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const target of AUTO_TARGETS) {
    if (submitted[target.name]) {
      console.log(`SKIP ${target.name} — already submitted (${submitted[target.name]})`);
      skipped++;
      continue;
    }

    const slug = pickArticle(target);
    const article = getArticleContent(slug);
    if (!article) {
      console.log(`FAIL ${target.name} — could not load article`);
      failed++;
      continue;
    }

    console.log(`\n--- ${target.name} (${target.url}) ---`);
    console.log(`  Article: ${article.title}`);

    if (dryRun) {
      console.log(`  [DRY RUN] Would submit`);
      success++;
      continue;
    }

    const submitter = SUBMITTERS[target.name];
    if (!submitter) {
      console.log(`  FAIL — no submitter for ${target.name}`);
      failed++;
      continue;
    }

    try {
      const page = await browser.newPage();
      await submitter(page, article);
      await page.close();
      submitted[target.name] = new Date().toISOString();
      saveSubmitted(submitted);
      success++;
      console.log(`  ✅ Submitted`);
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  if (browser) await browser.close();

  console.log(`\n=== Summary ===`);
  console.log(`Submitted: ${success}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  return { success, skipped, failed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dryRun = process.argv.includes("--dry");
  runAutoSubmits(dryRun).catch(console.error);
}
