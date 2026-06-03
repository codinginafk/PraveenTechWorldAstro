import { fileURLToPath } from "url";
import { resolve, dirname } from "path";
import {
  loadConfig,
  generateSlug,
  formatDate,
  writeReport,
  fetchXML,
  fetchJSON,
} from "./lib/shared.mjs";

async function tryNotify(category, count) {
  try {
    const botUrl = new URL("../../telegram/bot.mjs", import.meta.url).href;
    const { notifyOpportunity } = await import(botUrl);
    await notifyOpportunity(category, count);
  } catch {
    // Telegram not configured—silently skip
  }
}

function parseRSSItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/i;
  const linkRegex = /<link[^>]*>([\s\S]*?)<\/link>/i;
  const descRegex = /<description[^>]*>([\s\S]*?)<\/description>/i;
  const pubDateRegex = /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = (titleRegex.exec(itemXml)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    const link = (linkRegex.exec(itemXml)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    const description = (descRegex.exec(itemXml)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    const pubDate = pubDateRegex.exec(itemXml)?.[1] || "";

    if (title && link) {
      items.push({ title, link, description, pubDate });
    }
  }
  return items;
}

function matchKeywords(text, keywords) {
  if (!keywords || keywords.length === 0) return false;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function determineCategories(title, desc, config) {
  const text = `${title} ${desc}`.toLowerCase();
  const matched = [];
  for (const [category, keywords] of Object.entries(config.topicKeywords)) {
    if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
      matched.push(category);
    }
  }
  return matched.length > 0 ? matched : ["ai-tools"];
}

export async function runScout() {
  console.log("\n=== SCOUT AGENT ===\n");
  const config = loadConfig();
  const opportunities = [];
  const today = formatDate(new Date());

  console.log("1. Checking RSS feeds...\n");
  for (const feed of config.rssFeeds) {
    console.log(`  [RSS] ${feed.name}...`);
    const xml = await fetchXML(feed.url);
    if (!xml) continue;

    const items = parseRSSItems(xml);
    console.log(`    Found ${items.length} items`);

    for (const item of items) {
      const categories = determineCategories(item.title, item.description, config);
      if (categories.length > 0) {
        opportunities.push({
          source: feed.name,
          sourceType: "rss",
          title: item.title,
          url: item.link,
          description: item.description.slice(0, 300),
          categories,
          tags: feed.tags,
          pubDate: item.pubDate,
        });
      }
    }
  }

  console.log("\n2. Checking Reddit...\n");
  for (const sub of config.redditSubreddits) {
    console.log(`  [Reddit] ${sub.name}...`);
    const data = await fetchJSON(sub.url);
    if (!data?.data?.children) continue;

    const posts = data.data.children.map((c) => c.data).filter((p) => !p.stickied);
    console.log(`    Found ${posts.length} posts`);

    for (const post of posts) {
      const categories = determineCategories(post.title, post.selftext || post.url, config);
      if (categories.length > 0) {
        opportunities.push({
          source: sub.name,
          sourceType: "reddit",
          title: post.title,
          url: `https://reddit.com${post.permalink}`,
          description: (post.selftext || "").slice(0, 300) || post.title,
          categories,
          tags: sub.tags,
          pubDate: new Date(post.created_utc * 1000).toISOString(),
        });
      }
    }
  }

  console.log(`\n3. Found ${opportunities.length} total opportunities\n`);

  const grouped = {};
  for (const opp of opportunities) {
    for (const cat of opp.categories) {
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(opp);
    }
  }

  for (const [category, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;
    const slug = generateSlug(`${category}-opportunities-${today}`);
    const report = generateOpportunityReport(category, items, today, config);
    writeReport("opportunities", `${slug}.md`, report);
    console.log(`  Opportunity report for "${category}": ${items.length} items`);
    await tryNotify(category, items.length);
  }

  console.log("\n=== SCOUT COMPLETE ===\n");
  return opportunities;
}

function generateOpportunityReport(category, items, date, config) {
  const lines = [
    `# Opportunity Report: ${category}`,
    `Date: ${date}`,
    `Items found: ${items.length}`,
    "",
    `## Summary`,
    `Found ${items.length} potential topics in ${category} from ${[...new Set(items.map((i) => i.source))].join(", ")}.`,
    "",
    `## Opportunities`,
    "",
  ];

  for (const item of items) {
    lines.push(`### ${item.title}`);
    lines.push(`- **Source:** ${item.source} (${item.sourceType})`);
    lines.push(`- **URL:** ${item.url}`);
    lines.push(`- **Date:** ${item.pubDate}`);
    lines.push(`- **Categories:** ${item.categories.join(", ")}`);
    lines.push(`- **Tags:** ${item.tags?.join(", ") || "none"}`);
    if (item.description) {
      lines.push(`- **Snippet:** ${item.description.slice(0, 200)}`);
    }
    lines.push("");
  }

  lines.push(`## Topic Keywords`);
  const keywords = config.topicKeywords[category] || [];
  lines.push(keywords.map((kw) => `- ${kw}`).join("\n"));
  lines.push("");

  lines.push(`## Next Steps`);
  lines.push(`1. Review each opportunity for relevance`);
  lines.push(`2. Select the most promising topic`);
  lines.push(`3. Run the Research Agent: \`node research/agents/research.mjs "topic-slug"\``);
  lines.push(`4. Run the Draft Agent: \`node research/agents/draft.mjs "research-brief-slug"\``);
  lines.push("");

  return lines.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runScout().catch(console.error);
}
