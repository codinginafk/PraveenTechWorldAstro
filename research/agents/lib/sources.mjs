import { log, getCurrentsKey } from "./shared.mjs";

const TIMEOUT = 10000;

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function fetchGoogleNews(keywords = "AI privacy security productivity Windows Android ChatGPT how to") {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keywords)}&hl=en-US&gl=US&ceid=US:en`;
    const xml = await fetchWithTimeout(url);
    const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)];
    return items.slice(0, 20).map((item) => {
      const m = item[0];
      return {
        title: m.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "") || "",
        link: m.match(/<link>(.*?)<\/link>/)?.[1] || "",
        source: "Google News",
        snippet: m.match(/<description>(.*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "") || "",
        date: m.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "",
      };
    }).filter((a) => a.title);
  } catch (err) {
    log(`  [Google News] Error: ${err.message}`);
    return [];
  }
}

// Dedicated searches per pillar for better coverage
async function fetchGoogleNewsByPillar() {
  const queries = [
    "chatgpt tips guide how to 2026",
    "privacy remove data Google 2026",
    "password manager security 2026",
    "Windows 11 tips fix slow 2026",
    "Android tips settings 2026",
    "AI tools free students 2026",
    "career resume AI 2026",
    "automate office work free 2026",
    "productivity apps tools 2026",
    "free software alternatives 2026",
  ];
  const all = [];
  for (const q of queries) {
    try {
      const results = await fetchGoogleNews(q);
      all.push(...results);
    } catch { /* skip */ }
  }
  // Deduplicate
  const seen = new Set();
  return all.filter((a) => {
    const key = a.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchReddit(subreddits = ["ChatGPT", "Productivity", "WindowsHelp", "AndroidQuestions", "privacy", "security"]) {
  const results = [];
  for (const sub of subreddits) {
    try {
      const json = await fetchWithTimeout(
        `https://www.reddit.com/r/${sub}/hot.json?limit=8&raw_json=1`,
        { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" } }
      );
      const data = JSON.parse(json);
      const posts = data.data?.children || [];
      for (const post of posts) {
        const d = post.data;
        if (d.stickied) continue;
        results.push({
          title: d.title,
          link: `https://reddit.com${d.permalink}`,
          source: `Reddit r/${sub}`,
          snippet: d.selftext?.slice(0, 200) || "",
          score: d.score || 0,
          date: new Date(d.created_utc * 1000).toISOString(),
        });
      }
    } catch (err) {
      log(`  [Reddit r/${sub}] Error: ${err.message}`);
    }
  }
  return results;
}

export async function fetchHackerNews() {
  try {
    const ids = await fetchWithTimeout("https://hacker-news.firebaseio.com/v0/topstories.json");
    const topIds = JSON.parse(ids).slice(0, 15);
    const results = [];
    for (const id of topIds) {
      try {
        const item = await fetchWithTimeout(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        const d = JSON.parse(item);
        if (d.type !== "story" || !d.title) continue;
        results.push({
          title: d.title,
          link: d.url || `https://news.ycombinator.com/item?id=${d.id}`,
          source: "Hacker News",
          snippet: "",
          score: d.score || 0,
          date: new Date(d.time * 1000).toISOString(),
        });
      } catch { /* skip single item failure */ }
    }
    return results;
  } catch (err) {
    log(`  [Hacker News] Error: ${err.message}`);
    return [];
  }
}

export async function fetchCurrents(keywords = "ChatGPT AI productivity privacy security Windows Android") {
  const apiKey = getCurrentsKey();
  if (!apiKey) {
    log("  [Currents] No API key, skipping");
    return [];
  }
  try {
    const url = `https://api.currentsapi.services/v1/latest-news?language=en&limit=15`;
    const text = await fetchWithTimeout(url, {
      headers: { "Authorization": apiKey },
    });
    const data = JSON.parse(text);
    if (data.status !== "ok") {
      log(`  [Currents] API returned: ${data.status} — ${data.message || ""}`);
      return [];
    }
    return (data.news || []).map((n) => ({
      title: n.title,
      link: n.url,
      source: "Currents",
      snippet: n.description || "",
      date: n.published || "",
    }));
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("429") || msg.includes("402")) {
      log("  [Currents] Limit reached (429/402). Switching to fallback.");
    } else {
      log(`  [Currents] Error: ${msg}`);
    }
    return [];
  }
}

const PILLAR_KEYWORDS = ["chatgpt", "ai", "privacy", "security", "password", "windows", "android",
  "productivity", "career", "resume", "automation", "free", "student", "office",
  "google", "microsoft", "apple", "tracking", "data", "remove", "delete", "protect",
  "hack", "tip", "guide", "how to", "fix", "best", "compare", "vs", "tutorial"];

function isRelevant(title = "", snippet = "") {
  const text = (title + " " + snippet).toLowerCase();
  return PILLAR_KEYWORDS.some((kw) => text.includes(kw));
}

export async function fetchAllSources(keywords) {
  log("  Fetching all sources...");
  const [googleNews, pillarNews, reddit, hn] = await Promise.all([
    fetchGoogleNews(keywords),
    fetchGoogleNewsByPillar(),
    fetchReddit(),
    fetchHackerNews(),
  ]);
  // Filter HN for relevance (HN tends to be very technical)
  const relevantHn = hn.filter((h) => isRelevant(h.title, h.snippet));
  const all = [...googleNews, ...pillarNews, ...reddit, ...relevantHn];
  log(`  Got ${googleNews.length} GN, ${pillarNews.length} pillar, ${reddit.length} Reddit, ${relevantHn.length}/${hn.length} HN`);
  return all;
}
