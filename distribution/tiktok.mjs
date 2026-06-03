import { findArticle, extractSections, pickSocialHook, truncate, writeOutput } from "./lib/template.mjs";

export function generateTikTok(article) {
  const { frontmatter: fm, body } = article;
  const title = fm.title;
  const hook = pickSocialHook(fm);
  const sections = extractSections(body);
  const tags = Array.isArray(fm.tags) ? fm.tags : [];
  const category = fm.category || "technology";

  const keyPoint = sections.length > 0
    ? truncate(sections[0].content, 100)
    : truncate(body, 100);

  const script = [
    "🎬 **TIKTOK SCRIPT**",
    "",
    "---",
    "",
    "⏱ **Duration:** 60 seconds",
    "",
    "---",
    "",
    "**🎵 Audio:** Trending tech sound / original audio",
    "",
    "---",
    "",
    "**0:00-0:05 — Hook**",
    `[On screen: Text overlay "${truncate(hook, 80)}"]`,
    `Narrator: "${hook}"`,
    "",
    "**0:05-0:15 — Problem**",
    "[On screen: B-roll of someone struggling with the problem]",
    `Narrator: "The problem is that most people don't know about this."`,
    "",
    "**0:15-0:35 — Solution**",
    "[On screen: Screen recording / demonstration]",
    `Narrator: "Here is the fix: ${truncate(title, 100)}"`,
    `Narrator: "${keyPoint}"`,
    "",
    "**0:35-0:50 — Key Tips**",
    "[On screen: Caption bullets appearing one by one]",
    ...sections.slice(0, 3).map((s, i) =>
      `Narrator: "${s.heading} — ${truncate(s.content, 80)}"`
    ),
    "",
    "**0:50-0:60 — CTA**",
    "[On screen: Follow + Like animation]",
    `Narrator: "Follow for more ${category.replace(/-/g, " ")} tips!"`,
    "",
    "---",
    "",
    "**Hashtags:**",
    `#${category.replace(/-/g, "")} ${tags.slice(0, 4).map((t) => `#${t.replace(/-/g, "")}`).join(" ")} #techtips #learnontiktok`,
    "",
  ].join("\n");

  return script;
}

export async function generateTikTokScript(slug) {
  const article = findArticle(slug);
  if (!article) {
    console.error(`Article not found for slug: ${slug}`);
    return;
  }
  const script = generateTikTok(article);
  const outputSlug = slug.replace(/\.(mdx|md)$/, "");
  writeOutput("tiktok", `${outputSlug}-tiktok.txt`, script);

  console.log(`\n=== TIKTOK SCRIPT GENERATED ===\n`);
  console.log(script);
  console.log(`\nSaved to: distribution/output/tiktok/${outputSlug}-tiktok.txt\n`);
  return script;
}
