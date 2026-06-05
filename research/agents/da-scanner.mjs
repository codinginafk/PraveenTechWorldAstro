import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log, callLLM, ensureDir } from "./lib/shared.mjs";
import { appendToReport } from "./lib/report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.resolve(__dirname);
const STATE_FILE = path.join(AGENTS_DIR, "state.json");
const SITE_URL = "https://www.praveentechworld.com";
const SITE_DESC = "tech blog covering Android tips, Windows fixes, AI productivity, privacy, automation, and career growth";

// ─── Pre-compiled discovery lists per category ─────────────────────────────

const SOCIAL_PLATFORMS = [
  { url: "https://www.linkedin.com/company/praveentechworld", title: "LinkedIn Company Page", action: "Create company page + share articles", done: false },
  { url: "https://www.youtube.com/@praveentechworld", title: "YouTube Channel", action: "Create channel, add site in description, publish tutorials", done: false },
  { url: "https://www.pinterest.com/praveentechworld", title: "Pinterest Business", action: "Create board for each category, pin article images with links", done: false },
  { url: "https://github.com/praveentechworld", title: "GitHub Organization", action: "Create org, host free tools, link in README", done: false },
  { url: "https://www.producthunt.com/@praveentechworld", title: "Product Hunt", action: "List free tools (Windows Error Code Lookup first)", done: false },
  { url: "https://www.facebook.com/praveentechworld", title: "Facebook Page", action: "Create page, share articles, join tech groups", done: false },
  { url: "https://twitter.com/praveentechworld", title: "X / Twitter Profile", action: "Create profile, tweet article summaries with links", done: false },
  { url: "https://www.instagram.com/praveentechworld", title: "Instagram Business", action: "Create account, post tech tips carousels with link in bio", done: false },
  { url: "https://www.tiktok.com/@praveentechworld", title: "TikTok Profile", action: "Short tech tutorial videos with site link in bio", done: false },
  { url: "https://www.threads.net/@praveentechworld", title: "Threads Profile", action: "Cross-post from Twitter, engage tech community", done: false },
];

const TECH_DIRECTORIES = [
  { url: "https://www.crunchbase.com", title: "Crunchbase", action: "Add company listing with site URL", done: false },
  { url: "https://alternativeto.net", title: "AlternativeTo", action: "Suggest free tools listed on site as alternatives to paid tools", done: false },
  { url: "https://www.g2.com", title: "G2 Reviews", action: "Claim profile, list free tools/tutorials", done: false },
  { url: "https://www.capterra.com", title: "Capterra", action: "List free software tutorials", done: false },
  { url: "https://alltop.com", title: "AllTop", action: "Submit blog for inclusion in tech category", done: false },
  { url: "https://blogarama.com", title: "Blogarama", action: "Submit blog to tech directory", done: false },
  { url: "https://www.bloghub.com", title: "BlogHub", action: "List site in tech blog directory", done: false },
  { url: "https://startuprank.com", title: "StartUpRank", action: "Submit startup/tech blog listing", done: false },
  { url: "https://www.angellist.com", title: "AngelList", action: "Create startup profile with site", done: false },
  { url: "https://www.techblogsdb.com", title: "Tech Blogs Database", action: "Submit to tech blog registry", done: false },
  { url: "https://blog.feedspot.com/tech_blogs/", title: "FeedSpot Tech Blogs", action: "Submit site for inclusion in tech blog ranking", done: false },
  { url: "https://www.technorati.com", title: "Technorati", action: "Claim blog, add site to directory", done: false },
];

const QA_PLATFORMS = [
  { url: "https://stackoverflow.com", title: "Stack Overflow", action: "Answer tech questions, mention site in profile + answers where relevant", done: false },
  { url: "https://superuser.com", title: "Super User", action: "Answer Windows/Android questions, link to relevant guides", done: false },
  { url: "https://www.quora.com", title: "Quora", action: "Create Space for each topic, answer questions with article links", done: false },
  { url: "https://www.reddit.com/r/techsupport/", title: "Reddit r/techsupport", action: "Answer questions, link to relevant guides (follow subreddit rules)", done: false },
  { url: "https://www.reddit.com/r/Android/", title: "Reddit r/Android", action: "Share Android guides, engage in discussions", done: false },
  { url: "https://www.reddit.com/r/Windows10/", title: "Reddit r/Windows10", action: "Share Windows fix guides", done: false },
  { url: "https://www.reddit.com/r/Windows11/", title: "Reddit r/Windows11", action: "Share Windows 11 guides", done: false },
  { url: "https://www.reddit.com/r/privacy/", title: "Reddit r/privacy", action: "Share privacy guides", done: false },
  { url: "https://www.reddit.com/r/tech/", title: "Reddit r/tech", action: "Share general tech content", done: false },
  { url: "https://www.reddit.com/r/automation/", title: "Reddit r/automation", action: "Share automation workflow guides", done: false },
  { url: "https://www.reddit.com/r/careerguidance/", title: "Reddit r/careerguidance", action: "Share career growth tech content", done: false },
  { url: "https://askleo.com", title: "Ask Leo!", action: "Submit relevant tech tips as guest contribution", done: false },
];

const SYNDICATION_PLATFORMS = [
  { url: "https://medium.com", title: "Medium", action: "Republish articles with canonical link back to praveentechworld.com", done: false },
  { url: "https://dev.to", title: "Dev.to", action: "Cross-post tech/programming articles with canonical URL", done: false },
  { url: "https://hashnode.com", title: "Hashnode", action: "Create blog mirror with canonical link", done: false },
  { url: "https://www.linkedin.com/pulse/", title: "LinkedIn Articles", action: "Publish condensed versions linking to full article", done: false },
  { url: "https://newsbreak.com", title: "NewsBreak", action: "Apply as contributor, republish tech guides", done: false },
  { url: "https://substack.com", title: "Substack Newsletter", action: "Create weekly tech tips newsletter linking to articles", done: false },
  { url: "https://www.techmeme.com", title: "Techmeme", action: "Pitch relevant stories for coverage", done: false },
  { url: "https://hackernoon.com", title: "HackerNoon", action: "Submit tech tutorials for publication", done: false },
  { url: "https://www.freecodecamp.org/news/", title: "freeCodeCamp News", action: "Submit technical guides (if programming-related)", done: false },
];

const FORUMS = [
  { url: "https://forum.xda-developers.com", title: "XDA Developers Forums", action: "Create profile with site link, post Android guides in relevant sections", done: false },
  { url: "https://www.techspot.com/forum/", title: "TechSpot Forums", action: "Create profile with signature link, help in tech support sections", done: false },
  { url: "https://forums.windowscentral.com", title: "Windows Central Forums", action: "Create profile, post Windows fix guides in tutorials section", done: false },
  { url: "https://forums.androidcentral.com", title: "Android Central Forums", action: "Create profile, post Android guides", done: false },
  { url: "https://www.bleepingcomputer.com/forums/", title: "BleepingComputer Forums", action: "Help users with tech issues, link to detailed guides when appropriate", done: false },
  { url: "https://www.techguy.org", title: "TechGuy Forums", action: "Create profile, provide tech support with site references", done: false },
  { url: "https://forums.tomshardware.com", title: "Tom's Hardware Forums", action: "Participate in Windows/Android discussions", done: false },
  { url: "https://www.sevenforums.com", title: "Seven Forums", action: "Share Windows guides", done: false },
  { url: "https://www.tenforums.com", title: "Ten Forums", action: "Share Windows 10/11 guides", done: false },
  { url: "https://discord.gg/tech", title: "Discord Tech Servers", action: "Join tech Discord servers, share guides in relevant channels", done: false },
];

const HARO_ALTERNATIVES = [
  { url: "https://www.helpareporter.com", title: "HARO / Connectively", action: "Sign up as tech source, respond to journalist queries", done: false },
  { url: "https://www.qwoted.com", title: "Qwoted", action: "Create journalist profile, get quoted in articles with backlink", done: false },
  { url: "https://sourcebottle.com", title: "SourceBottle", action: "Register as expert source for tech topics", done: false },
  { url: "https://featured.com", title: "Featured", action: "Respond to HARO-like queries for tech stories", done: false },
  { url: "https://podcastguests.com", title: "PodcastGuests", action: "List yourself as guest for tech podcasts", done: false },
  { url: "https://www.matchmaker.fm", title: "MatchMaker.fm", action: "Find podcast hosting opportunities as tech guest", done: false },
  { url: "https://podcasters.spotify.com", title: "Spotify for Podcasters", action: "Start own tech podcast or find collaboration", done: false },
  { url: "https://www.clubhouse.com", title: "Clubhouse", action: "Host tech tip rooms, mention site", done: false },
  { url: "https://twitter.com/i/spaces", title: "Twitter Spaces", action: "Host weekly tech Q&A spaces", done: false },
];

const RESOURCE_PAGES = [
  { url: "https://www.techradar.com/how-to", title: "TechRadar How To", action: "Pitch article for coverage with backlink", done: false },
  { url: "https://www.howtogeek.com", title: "How-To Geek", action: "Submit tip as reader contribution", done: false },
  { url: "https://www.lifehacker.com/tech", title: "Lifehacker Tech", action: "Tip line for tech how-to stories", done: false },
  { url: "https://www.tomsguide.com/how-to", title: "Tom's Guide How To", action: "Pitch tutorial for syndication", done: false },
  { url: "https://www.makeuseof.com", title: "MakeUseOf", action: "Contribute guest post or tip", done: false },
  { url: "https://www.techspot.com", title: "TechSpot", action: "Submit news tip or guide", done: false },
  { url: "https://www.ghacks.net", title: "gHacks", action: "Submit software/tech tip", done: false },
  { url: "https://www.techsupportalert.com", title: "Tech Support Alert", action: "Submit free software recommendation with link", done: false },
  { url: "https://www.ilovefreesoftware.com", title: "ILoveFreeSoftware", action: "Submit free tool recommendation", done: false },
  { url: "https://www.techpp.com", title: "TechPP", action: "Submit guest post", done: false },
];

const BACKLINK_BUILDING = [
  { url: "https://en.wikipedia.org", title: "Wikipedia", action: "Cite site on relevant tech articles if content becomes notable enough", done: false },
  { url: "https://scholar.google.com", title: "Google Scholar", action: "Cite research-backed tech guides if applicable", done: false },
  { url: "https://www.gov.uk", title: ".gov sites", action: "Find .gov resource pages with broken links our content can replace", done: false },
  { url: "https://www.ed.gov", title: ".edu sites", action: "Find university tech resource pages, suggest adding our guides", done: false },
  { url: "https://www.merlot.org", title: "MERLOT (.edu)', action: 'Submit tech tutorials as learning materials", done: false },
  { url: "https://www.oercommons.org", title: "OER Commons", action: "Submit educational tech guides as open resources", done: false },
  { url: "https://brokenthorn.com", title: "Broken Link Building Tool', action: 'Use Ahrefs or similar to find broken links on tech sites", done: false },
];

const TOOL_DIRECTORIES = [
  { url: "https://github.com", title: "GitHub Repositories", action: "Create open-source Windows Error Code Lookup tool, add site to README", done: false },
  { url: "https://www.npmjs.com", title: "NPM", action: "If building JS tools, publish packages with author site link", done: false },
  { url: "https://www.saashub.com", title: "SaaSHub", action: "List free tools", done: false },
  { url: "https://www.gethuman.com", title: "GetHuman", action: "List phone/contact info guides", done: false },
  { url: "https://toolbox.google.com", title: "Google Toolbox", action: "Create free tools that earn natural backlinks", done: false },
  { url: "https://www.freewebapplist.com", title: "Free Web App List", action: "Submit free online tools", done: false },
];

const ALL_CATEGORIES = [
  { name: "Social Profiles", key: "social", sites: SOCIAL_PLATFORMS },
  { name: "Tech Directories", key: "directories", sites: TECH_DIRECTORIES },
  { name: "Q&A Platforms", key: "qa", sites: QA_PLATFORMS },
  { name: "Syndication Platforms", key: "syndication", sites: SYNDICATION_PLATFORMS },
  { name: "Forums", key: "forums", sites: FORUMS },
  { name: "HARO & Media", key: "haro", sites: HARO_ALTERNATIVES },
  { name: "Resource Pages", key: "resources", sites: RESOURCE_PAGES },
  { name: "Backlink Building", key: "backlinks", sites: BACKLINK_BUILDING },
  { name: "Tool Directories", key: "tools", sites: TOOL_DIRECTORIES },
];

// ─── State ─────────────────────────────────────────────────────────────────

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { daScanner: { completed: [], pending: [] } };
  }
}

function saveState(state) {
  ensureDir(AGENTS_DIR);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10000) });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

function getDomain(urlStr) {
  try { return new URL(urlStr).hostname.replace("www.", ""); } catch { return ""; }
}

function notDone(sites) {
  return sites.filter((s) => !s.done);
}

// ─── LLM enhancement per category ──────────────────────────────────────────

async function getLlmSuggestions(categoryName, categoryKey) {
  const systemPrompt = `You are a domain authority strategist. Suggest 5 additional ${categoryName} (websites/platforms) where a tech blog about Android, Windows, AI, privacy, automation, and career growth can get exposure and backlinks. Return ONLY a JSON array of objects with keys: title, url, action (one sentence describing what to do).`;

  const userPrompt = `Suggest 5 more ${categoryName} for praveentechworld.com, a ${SITE_DESC}. Focus on free options. Return JSON array.`;

  try {
    const result = await callLLM(systemPrompt, userPrompt, { temperature: 0.5, maxTokens: 2048 });
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]);
      return items.map((i) => ({
        url: i.url,
        title: i.title,
        action: i.action || "Investigate",
        done: false,
        llmSuggested: true,
      }));
    }
  } catch (err) {
    log(`[DAScanner] LLM ${categoryKey} error: ${err.message}`);
  }
  return [];
}

// ─── Check category sites ──────────────────────────────────────────────────

async function checkSites(category, state) {
  const completed = new Set(state.daScanner?.completed || []);
  const baseSites = category.sites.map((s) => ({
    ...s,
    key: `${category.key}:${getDomain(s.url)}`,
  }));
  const llmSites = await getLlmSuggestions(category.name, category.key);
  const llmSitesWithKey = llmSites.map((s) => ({
    ...s,
    key: `${category.key}:${getDomain(s.url)}`,
  }));
  const allSites = [...baseSites, ...llmSitesWithKey];
  const results = [];
  for (const site of allSites) {
    const isDone = completed.has(site.key);
    const { ok, status } = await checkUrl(site.url);
    results.push({
      ...site,
      reachable: ok,
      status,
      done: isDone,
    });
    if (!ok) log(`  ${status} ${site.url}`);
    await new Promise((r) => setTimeout(r, 300));
  }
  return results;
}

// ─── Report writer ─────────────────────────────────────────────────────────

function formatResults(results, categoryName) {
  const lines = [`**${categoryName} — ${results.length} sites scanned**`, ""];
  const done = results.filter((r) => r.done);
  const pending = results.filter((r) => !r.done);
  const unreachable = results.filter((r) => !r.reachable && !r.done);
  if (done.length) {
    lines.push(`✅ Completed (${done.length}):`);
    done.forEach((r) => lines.push(`  - [${r.title}](${r.url})`));
    lines.push("");
  }
  if (pending.length) {
    lines.push(`⬜ Pending (${pending.length}):`);
    pending.slice(0, 15).forEach((r) => {
      const reachable = r.reachable ? "" : ` (HTTP ${r.status || "???"} — may not be accessible)`;
      lines.push(`  - [${r.title}](${r.url}) — ${r.action}${reachable}`);
    });
    if (pending.length > 15) lines.push(`  - ...and ${pending.length - 15} more`);
    lines.push("");
  }
  if (unreachable.length) {
    lines.push(`⚠️  Unreachable (${unreachable.length}):`);
    unreachable.forEach((r) => lines.push(`  - [${r.title}](${r.url}) — HTTP ${r.status || "timeout"}`));
    lines.push("");
  }
  return lines.join("\n");
}

// ─── Main ──────────────────────────────────────────────────────────────────

export async function runDaScanner() {
  log("[DAScanner] Starting Domain Authority scan...");
  const state = loadState();
  const reportSections = [];
  let totalDone = 0;
  let totalPending = 0;

  for (const category of ALL_CATEGORIES) {
    log(`[DAScanner] Scanning: ${category.name}...`);
    const results = await checkSites(category, state);
    const content = formatResults(results, category.name);
    reportSections.push({ section: `DA Scanner — ${category.name}`, content });
    totalDone += results.filter((r) => r.done).length;
    totalPending += results.filter((r) => !r.done).length;
  }

  // Write all sections to report
  for (const { section, content } of reportSections) {
    appendToReport(section, content);
  }

  // Update state
  const allCompleted = [];
  for (const category of ALL_CATEGORIES) {
    const baseKeys = category.sites.map((s) => `${category.key}:${getDomain(s.url)}`);
    allCompleted.push(...baseKeys);
  }
  state.daScanner = state.daScanner || { completed: [], pending: [] };
  state.daScanner.lastRun = new Date().toISOString();
  state.daScanner.totalSites = totalDone + totalPending;
  state.daScanner.completedCount = totalDone;
  state.daScanner.pendingCount = totalPending;
  saveState(state);

  // Summary
  const summary = [
    "## DA Scanner — Summary",
    "",
    `**Total sites discovered:** ${totalDone + totalPending}`,
    `**Completed:** ${totalDone}`,
    `**Pending:** ${totalPending}`,
    `**Last run:** ${new Date().toISOString()}`,
    "",
    "### Priority Actions",
    "1. Create all social media profiles listed above",
    "2. Submit listing to all tech directories",
    "3. Start answering 1 question/day on Stack Overflow & Quora",
    "4. Republish top 5 articles on Medium/Dev.to with canonical links",
    "5. Join top 3 forums and create profile with site link",
    "6. Sign up for HARO/Qwoted/Featured as tech source",
    "7. Build the Windows Error Code Lookup tool on GitHub",
    "",
    "*Auto-generated by DA Scanner Agent*",
  ].join("\n");
  appendToReport("DA Scanner — Summary", summary);

  log(`[DAScanner] Complete. ${totalDone + totalPending} total sites, ${totalDone} done, ${totalPending} pending.`);
  return { total: totalDone + totalPending, done: totalDone, pending: totalPending };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDaScanner().catch(console.error);
}
