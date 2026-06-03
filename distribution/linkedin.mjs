import { findArticle, extractSections, pickSocialHook, truncate, writeOutput } from "./lib/template.mjs";

export function generateLinkedIn(article) {
  const { frontmatter: fm, body } = article;
  const title = fm.title;
  const hook = pickSocialHook(fm);
  const sections = extractSections(body);
  const tags = Array.isArray(fm.tags) ? fm.tags : [];
  const category = fm.category || "technology";

  const keyInsight = sections.length > 1
    ? sections.slice(0, 3).map((s) => `**${s.heading}**\n\n${truncate(s.content, 200)}`).join("\n\n")
    : truncate(body, 300);

  const bulletPoints = sections.length > 0
    ? sections.slice(0, 5).map((s) => `• ${s.heading}`).join("\n")
    : "• Practical tips you can apply today";

  const post = [
    `💡 ${title}`,
    "",
    hook,
    "",
    "---",
    "",
    keyInsight,
    "",
    "Here is what I cover:",
    "",
    bulletPoints,
    "",
    "---",
    "",
    "💬 Which tip surprised you most? Drop a comment below.",
    "",
    `#${category.replace(/-/g, "")} #${tags.slice(0, 3).map((t) => t.replace(/-/g, "")).join(" #")}`,
    "",
  ].join("\n");

  return post;
}

export async function generateLinkedInPost(slug) {
  const article = findArticle(slug);
  if (!article) {
    console.error(`Article not found for slug: ${slug}`);
    return;
  }
  const post = generateLinkedIn(article);
  const outputSlug = slug.replace(/\.(mdx|md)$/, "");
  writeOutput("linkedin", `${outputSlug}-linkedin.txt`, post);

  console.log(`\n=== LINKEDIN POST GENERATED ===\n`);
  console.log(post);
  console.log(`\nSaved to: distribution/output/linkedin/${outputSlug}-linkedin.txt\n`);
  return post;
}
