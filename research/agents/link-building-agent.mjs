import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log, callLLM, ensureDir } from "./lib/shared.mjs";
import { appendToReport } from "./lib/report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.resolve(__dirname);
const STATE_FILE = path.join(AGENTS_DIR, "state.json");

const GUEST_POST_DIRECTORIES = [
  { url: "https://www.bloggeroutreach.com/guest-blogging-sites/", title: "Blogger Outreach Guest Blog Sites" },
  { url: "https://guestposttracker.com/", title: "Guest Post Tracker" },
  { url: "https://www.adamenfroy.com/guest-blogging-sites", title: "Adam Enfroy Guest Blog Sites" },
  { url: "https://www.techcrunch.com/contribute/", title: "TechCrunch Guest Post" },
  { url: "https://www.theverge.com/contact/", title: "The Verge Contact" },
  { url: "https://www.makeuseof.com/contribute/", title: "MakeUseOf Write for Us" },
  { url: "https://www.guidingtech.com/contribute/", title: "Guiding Tech Contribute" },
  { url: "https://windowsreport.com/write-for-us/", title: "Windows Report Write for Us" },
  { url: "https://www.online-tech-tips.com/guest-posts/", title: "Online Tech Tips Guest Posts" },
  { url: "https://www.techsupportalert.com/contribute", title: "Tech Support Alert Contribute" },
  { url: "https://www.hongkiat.com/blog/guest-post/", title: "Hongkiat Guest Post" },
  { url: "https://beebom.com/write-for-us/", title: "Beebom Write for Us" },
  { url: "https://www.gadgets360.com/write-for-us", title: "Gadgets 360 Write for Us" },
  { url: "https://www.androidpolice.com/write-for-us/", title: "Android Police Write for Us" },
  { url: "https://www.nextpit.com/write-for-us", title: "NextPit Write for Us" },
];

const RESOURCE_PAGE_CANDIDATES = [
  { url: "https://www.makeuseof.com/tag/tech-tips/", title: "MakeUseOf Tech Tips" },
  { url: "https://www.techradar.com/how-to", title: "TechRadar How To" },
  { url: "https://www.pcmag.com/how-to", title: "PCMag How To" },
  { url: "https://www.howtogeek.com", title: "How-To Geek" },
  { url: "https://www.lifehacker.com/tech", title: "Lifehacker Tech" },
  { url: "https://www.digitaltrends.com/how-to/", title: "Digital Trends How To" },
  { url: "https://www.tomsguide.com/how-to", title: "Tom's Guide How To" },
  { url: "https://www.androidauthority.com/tips-tricks/", title: "Android Authority Tips" },
  { url: "https://www.windowscentral.com/how-to", title: "Windows Central How To" },
  { url: "https://www.ghacks.net", title: "gHacks Tech News" },
  { url: "https://www.techspot.com", title: "TechSpot" },
];

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { contacted: [], opportunities: [], lastRun: null };
  }
}

function saveState(state) {
  ensureDir(AGENTS_DIR);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10000) });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function checkGuestPostPages() {
  log("[LinkBuilding] Checking known guest post directories...");
  const results = [];
  for (const site of GUEST_POST_DIRECTORIES) {
    const { ok, status } = await checkUrl(site.url);
    results.push({
      ...site,
      reachable: ok,
      status,
      type: "guest-post-directory",
      topic: "general",
    });
    if (!ok) log(`  Unreachable: ${site.url} (${status})`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  return results.filter((r) => r.reachable);
}

async function checkResourcePages() {
  log("[LinkBuilding] Checking known resource pages...");
  const results = [];
  for (const site of RESOURCE_PAGE_CANDIDATES) {
    const { ok, status } = await checkUrl(site.url);
    results.push({
      ...site,
      reachable: ok,
      status,
      type: "resource-page-candidate",
      topic: "general",
    });
    if (!ok) log(`  Unreachable: ${site.url} (${status})`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  return results.filter((r) => r.reachable);
}

async function generateLLMSuggestions() {
  log("[LinkBuilding] Getting LLM suggestions for guest post + resource sites...");
  const systemPrompt = `You are a link-building strategist. Suggest 10 specific websites that accept guest posts about tech/Android/Windows/AI/privacy topics. For each site, provide: name, URL, and topic focus. Format as JSON array of objects with keys: name, url, topic.`;

  const userPrompt = `I run a tech blog at praveentechworld.com covering Android tips, Windows fixes, AI productivity, privacy, automation, and career growth. Suggest 10 sites that would accept a guest post on these topics.`;

  try {
    const result = await callLLM(systemPrompt, userPrompt, { temperature: 0.5, maxTokens: 2048 });
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const sites = JSON.parse(jsonMatch[0]);
      return sites.map((s) => ({
        url: s.url,
        title: s.name,
        topic: s.topic || "general",
        type: "llm-suggested-guest-post",
      }));
    }
  } catch (err) {
    log(`[LinkBuilding] LLM suggestion error: ${err.message}`);
  }
  return [];
}

async function checkBrokenLinks(urls, maxCheck = 10) {
  log("[LinkBuilding] Checking for broken links...");
  const broken = [];
  const valid = urls.filter((u) => {
    try { new URL(u.url); return true; } catch { return false; }
  });
  const toCheck = valid.slice(0, maxCheck);
  for (const item of toCheck) {
    const { ok, status } = await checkUrl(item.url);
    if (!ok) {
      broken.push({ ...item, status });
      log(`  Broken: ${status} ${item.url}`);
    }
  }
  return broken;
}

async function generateGrowthTactics() {
  log("[LinkBuilding] Generating free growth tactics via LLM...");
  const state = loadState();
  const contactedCount = (state.contacted || []).length;
  const systemPrompt = "You are a growth marketing expert for a tech blog. Suggest 5 free or low-cost link-building and growth tactics specifically for a new tech blog (praveentechworld.com) that publishes guides on Android, Windows, AI, privacy, automation, and career growth. Focus on actionable, specific tactics. Return as a numbered list with a brief explanation for each.";
  const userPrompt = `The blog has ${(state.opportunities || []).length} link opportunities found and has contacted ${contactedCount} sites so far. Suggest the next 5 best growth tactics to prioritize.`;
  try {
    return await callLLM(systemPrompt, userPrompt, { temperature: 0.7, maxTokens: 2048 });
  } catch (err) {
    log(`[LinkBuilding] LLM growth tactics error: ${err.message}`);
    return "1. Contribute to HARO/Connectively queries\n2. Find broken links on .edu/.gov sites\n3. Create free tools for backlinks\n4. Write LinkedIn articles linking back\n5. Join relevant Reddit communities";
  }
}

async function generateOutreachEmail(siteUrl, siteTitle) {
  const systemPrompt = "You are an outreach specialist. Write a short, personalized guest post pitch email (max 150 words). Be friendly, specific about the value you provide, and suggest 2 article topics. Sign as \"Praveen from praveentechworld.com\"";

  const userPrompt = `Write a guest post pitch for ${siteTitle} (${siteUrl}). Topics I can write about: Android tips, Windows fixes, AI productivity, privacy guides, automation, career growth in tech.`;
  try {
    return await callLLM(systemPrompt, userPrompt, { temperature: 0.7, maxTokens: 1024 });
  } catch (err) {
    log(`[LinkBuilding] Outreach email error: ${err.message}`);
    return "";
  }
}

function getDomain(urlStr) {
  try {
    return new URL(urlStr).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

async function filterNew(results) {
  const state = loadState();
  const alreadyContacted = new Set((state.contacted || []).map((c) => c.url));
  return results.filter((r) => {
    const domain = getDomain(r.url);
    if (!domain) return false;
    return !alreadyContacted.has(r.url)
      && !domain.includes("facebook")
      && !domain.includes("twitter")
      && !domain.includes("linkedin")
      && !domain.includes("reddit")
      && !domain.includes("pinterest");
  });
}

async function writeReport(section, content) {
  appendToReport(`Link Building — ${section}`, content);
}

export async function runLinkBuilding() {
  log("[LinkBuilding] Starting link building analysis...");
  const state = loadState();
  const reportSections = [];

  // 1. Check known guest post directories
  const reachableDirs = await checkGuestPostPages();
  const guestPostContent = [
    `**Guest Post Directories (${reachableDirs.length} reachable)**`,
    "",
    ...reachableDirs.map((s, i) =>
      `${i + 1}. [${s.title}](${s.url}) — HTTP ${s.status}`
    ),
    reachableDirs.length === 0 ? "No guest post directories reachable." : "",
  ].filter(Boolean).join("\n");
  reportSections.push({ section: "Guest Post Directories", content: guestPostContent });

  // 2. Check known resource pages
  const reachableResources = await checkResourcePages();
  const resourceContent = [
    `**Resource Pages (${reachableResources.length} reachable)**`,
    "",
    ...reachableResources.map((s, i) =>
      `${i + 1}. [${s.title}](${s.url}) — HTTP ${s.status}`
    ),
    reachableResources.length === 0 ? "No resource pages reachable." : "",
  ].filter(Boolean).join("\n");
  reportSections.push({ section: "Resource Pages", content: resourceContent });

  // 3. Get LLM suggestions for additional sites
  const llmSites = await generateLLMSuggestions();
  const newLlmSites = await filterNew(llmSites);
  if (newLlmSites.length > 0) {
    const llmContent = [
      `**LLM-Suggested Guest Post Sites (${newLlmSites.length} new)**`,
      "",
      ...newLlmSites.map((s, i) =>
        `${i + 1}. [${s.title}](${s.url}) — *${s.topic}*`
      ),
    ].join("\n");
    reportSections.push({ section: "LLM Suggestions", content: llmContent });
  }

  // 4. Check for broken links on all collected sites
  const allSites = [...reachableDirs, ...reachableResources, ...llmSites];
  const brokenLinks = await checkBrokenLinks(allSites, 5);
  const brokenContent = [
    `**Broken Link Opportunities (${brokenLinks.length} found)**`,
    "",
    ...brokenLinks.slice(0, 10).map((b, i) =>
      `${i + 1}. ${b.url} — HTTP ${b.status || "timeout"}`
    ),
    "",
    brokenLinks.length === 0 ? "No broken links detected on checked pages." : "Consider creating replacement content for these.",
  ].filter(Boolean).join("\n");
  reportSections.push({ section: "Broken Links", content: brokenContent });

  // 5. Generate growth tactics
  const tactics = await generateGrowthTactics();
  const tacticsContent = [
    `**Free Growth Tactics (LLM-generated)**`,
    "",
    tactics,
  ].join("\n");
  reportSections.push({ section: "Growth Tactics", content: tacticsContent });

  // 6. Generate outreach emails for top 3 resources
  const outreachContent = [];
  const topSites = reachableDirs.slice(0, 3);
  for (const site of topSites) {
    const email = await generateOutreachEmail(site.url, site.title);
    if (email) {
      outreachContent.push(`### Pitch for ${site.title}\n${site.url}\n\n${email}\n`);
    }
  }
  const outreachSection = outreachContent.length > 0
    ? `**Generated Outreach Emails**\n\n${outreachContent.join("\n---\n")}`
    : "**Generated Outreach Emails**\n\nNo high-priority sites to draft emails for.";
  reportSections.push({ section: "Outreach Emails", content: outreachSection });

  // 7. Write all sections to report
  for (const { section, content } of reportSections) {
    await writeReport(section, content);
  }

  // 8. Update state
  state.lastRun = new Date().toISOString();
  const newOpportunities = reachableDirs.map((s) => ({
    url: s.url, title: s.title, type: "guest-post", foundAt: new Date().toISOString(),
  }));
  state.opportunities = [...(state.opportunities || []), ...newOpportunities];
  saveState(state);

  log(`[LinkBuilding] Complete. ${reachableDirs.length} directories, ${reachableResources.length} resources, ${brokenLinks.length} broken, ${newLlmSites.length} LLM suggestions.`);
  return { directories: reachableDirs.length, resources: reachableResources.length, broken: brokenLinks.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLinkBuilding().catch(console.error);
}
