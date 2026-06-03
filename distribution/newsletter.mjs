import { findArticle, extractSections, pickSocialHook, truncate, writeOutput } from "./lib/template.mjs";

export function generateNewsletter(article) {
  const { frontmatter: fm, body } = article;
  const title = fm.title;
  const hook = pickSocialHook(fm);
  const sections = extractSections(body);
  const tags = Array.isArray(fm.tags) ? fm.tags : [];
  const category = fm.category || "technology";

  const issueNumber = "1";
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const newsletter = [
    `**📬 PraveenTechWorld — Issue #${issueNumber}**`,
    `**${date}**`,
    "",
    "---",
    "",
    `# ${title}`,
    "",
    hook,
    "",
    "---",
    "",
    ...sections.map((s) => [
      `## ${s.heading}`,
      "",
      s.content,
      "",
    ]).flat(),
    "---",
    "",
    "## 📌 Quick Tips",
    "",
    ...(sections.length > 0
      ? sections.slice(0, 3).map((s, i) => `${i + 1}. **${s.heading}:** ${truncate(s.content, 100)}`)
      : ["1. **Start small** — Apply one tip at a time"]
    ),
    "",
    "---",
    "",
    "## ❓ Got Questions?",
    "",
    "Reply to this email and I will answer your questions in the next issue.",
    "",
    "---",
    "",
    "**Loved this? Share it with a friend who needs it.**",
    "",
    `_You are receiving this because you subscribed at PraveenTechWorld._`,
    `_Tags: ${tags.join(", ") || category}_`,
    "",
  ].join("\n");

  return newsletter;
}

export async function generateNewsletterEmail(slug) {
  const article = findArticle(slug);
  if (!article) {
    console.error(`Article not found for slug: ${slug}`);
    return;
  }
  const email = generateNewsletter(article);
  const outputSlug = slug.replace(/\.(mdx|md)$/, "");
  writeOutput("newsletter", `${outputSlug}-newsletter.txt`, email);

  console.log(`\n=== NEWSLETTER EMAIL GENERATED ===\n`);
  console.log(email);
  console.log(`\nSaved to: distribution/output/newsletter/${outputSlug}-newsletter.txt\n`);
  return email;
}
