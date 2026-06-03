import { findArticle, extractSections, pickSocialHook, truncate, writeOutput } from "./lib/template.mjs";

export function generateInstagram(article) {
  const { frontmatter: fm, body } = article;
  const title = fm.title;
  const hook = pickSocialHook(fm);
  const sections = extractSections(body);
  const tags = Array.isArray(fm.tags) ? fm.tags : [];
  const category = fm.category || "technology";

  const slides = [];

  // Slide 1: Title card
  slides.push([
    `📖 **${title}**`,
    "",
    hook,
    "",
    `_Swipe for more →_`,
  ].join("\n"));

  // Slides 2-5: Key points
  const keyPoints = sections.slice(0, 4);
  if (keyPoints.length > 0) {
    for (const sec of keyPoints) {
      const lines = truncate(sec.content, 200).split("\n").filter(Boolean).slice(0, 3);
      slides.push([
        `**${sec.heading}**`,
        "",
        ...lines.map((l) => `• ${l}`),
        "",
        "_Swipe for more →_",
      ].join("\n"));
    }
  }

  // Last slide: CTA
  slides.push([
    "💡 **Key Takeaway**",
    "",
    truncate(body, 150),
    "",
    "---",
    "",
    "Follow for more practical tech tips.",
    "",
    `_${category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}_`,
  ].join("\n"));

  const post = slides.map((s, i) => `--- SLIDE ${i + 1} ---\n${s}`).join("\n\n");

  return post;
}

export async function generateInstagramCarousel(slug) {
  const article = findArticle(slug);
  if (!article) {
    console.error(`Article not found for slug: ${slug}`);
    return;
  }
  const carousel = generateInstagram(article);
  const outputSlug = slug.replace(/\.(mdx|md)$/, "");
  writeOutput("instagram", `${outputSlug}-instagram.txt`, carousel);

  console.log(`\n=== INSTAGRAM CAROUSEL GENERATED (${carousel.split("SLIDE").length - 1} slides) ===\n`);
  console.log(carousel);
  console.log(`\nSaved to: distribution/output/instagram/${outputSlug}-instagram.txt\n`);
  return carousel;
}
