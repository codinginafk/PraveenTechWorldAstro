import { generateArticle } from "./generate.mjs";

const articles = [
  {
    title: "How to Build a Website from Scratch in 2026: A Complete Beginner Guide",
    description: "Build your first website without coding knowledge. Step by step guide covering domains, hosting, and site builders.",
    category: "free-software",
    tags: ["website building", "beginner guide", "web development"],
    seoTitle: "Build a Website from Scratch in 2026 — Complete Guide for Beginners",
    socialHook: "You do not need to code to build a website anymore. Here is exactly how to do it in 2026 with free tools.",
    publishDate: "2026-05-01",
  },
  {
    title: "Google Analytics for Beginners: How to Track Your Website Traffic",
    description: "Set up Google Analytics 4 and start tracking visitors, page views, and user behavior on your site today.",
    category: "productivity",
    tags: ["google analytics", "website tracking", "analytics guide"],
    seoTitle: "Google Analytics 4 for Beginners — Track Website Traffic Step by Step",
    socialHook: "Most website owners never look at their analytics. That is a mistake. Here is how to set it up and actually understand it.",
    publishDate: "2026-05-03",
  },
  {
    title: "What Is Domain Authority and How to Improve It in 2026",
    description: "Domain authority explained simply. Actionable steps to increase your site authority and rank higher on Google.",
    category: "career-growth",
    tags: ["domain authority", "SEO", "website ranking"],
    seoTitle: "Domain Authority Explained — How to Improve Your Site Authority in 2026",
    socialHook: "Your domain authority is not a Google ranking factor. But it correlates with one. Here is how to actually improve it.",
    publishDate: "2026-05-05",
  },
  {
    title: "SEO Basics: How to Rank Higher on Google in 2026",
    description: "Learn the fundamentals of search engine optimization. Simple changes that help your pages appear in search results.",
    category: "productivity",
    tags: ["SEO basics", "Google ranking", "search optimization"],
    seoTitle: "SEO Basics for 2026 — How to Rank Higher on Google as a Beginner",
    socialHook: "Google changed its algorithm 12 times last year. But the basics still work. Here is what actually helps you rank.",
    publishDate: "2026-05-07",
  },
  {
    title: "How to Set Up Google Search Console for Your New Website",
    description: "Verify your site with Google Search Console and start tracking search performance, indexing status, and fix issues.",
    category: "productivity",
    tags: ["google search console", "website verification", "SEO tools"],
    seoTitle: "Google Search Console Setup Guide for New Websites — Step by Step",
    socialHook: "You cannot fix what you cannot measure. Google Search Console shows you exactly why your pages are not ranking.",
    publishDate: "2026-05-09",
  },
  {
    title: "Website Speed Optimization: Why It Matters for SEO and How to Fix It",
    description: "Slow websites lose visitors and rankings. Practical tips to speed up your site without hiring a developer.",
    category: "productivity",
    tags: ["website speed", "page speed", "SEO optimization"],
    seoTitle: "Website Speed Optimization Guide — Boost SEO by Loading Faster",
    socialHook: "A one second delay in page load time can reduce conversions by 7 percent. Here is how to fix your slow site for free.",
    publishDate: "2026-05-12",
  },
  {
    title: "How to Write SEO Friendly Blog Posts That Actually Rank on Google",
    description: "Stop writing content that nobody finds. Learn the structure and strategy behind blog posts that rank in search.",
    category: "productivity",
    tags: ["SEO writing", "blog optimization", "content strategy"],
    seoTitle: "SEO Friendly Blog Writing — How to Write Posts That Rank in 2026",
    socialHook: "You can write the best article in the world. If Google cannot understand it, nobody will read it. Here is how to fix that.",
    publishDate: "2026-05-15",
  },
  {
    title: "Backlink Building Guide for New Websites: Get Your First Quality Links",
    description: "Earn backlinks without spending money. Proven strategies for new sites to build authority through quality links.",
    category: "career-growth",
    tags: ["backlinks", "link building", "SEO strategy"],
    seoTitle: "Backlink Building for Beginners — Get Your First Quality Links in 2026",
    socialHook: "New websites have zero authority. Backlinks are how you earn it. Here is how to get your first ones without paying.",
    publishDate: "2026-05-18",
  },
  {
    title: "How to Use Google Analytics 4 to Improve Your Content Strategy",
    description: "Stop guessing what your audience wants. Use GA4 data to create content that attracts and retains visitors.",
    category: "productivity",
    tags: ["GA4", "content strategy", "analytics"],
    seoTitle: "Use Google Analytics 4 to Improve Content Strategy — Data Driven Guide",
    socialHook: "Most people install Google Analytics and never look at it again. Here is how to use it to write better content.",
    publishDate: "2026-05-22",
  },
  {
    title: "Technical SEO Checklist for Beginners: Fix These Issues to Rank Better",
    description: "Simple technical fixes that help Google crawl and index your site properly. No coding required.",
    category: "privacy",
    tags: ["technical SEO", "SEO checklist", "site optimization"],
    seoTitle: "Technical SEO Checklist for Beginners — Simple Fixes That Help You Rank",
    socialHook: "You can have the best content on the internet. If Google cannot crawl it, it does not exist. Here is your technical SEO checklist.",
    publishDate: "2026-05-26",
  },
];

async function main() {
  for (const a of articles) {
    try {
      await generateArticle(a);
    } catch (err) {
      console.error(`Failed: ${a.title}: ${err.message}`);
    }
  }
  console.log("\n=== Batch complete ===");
}

main().catch(console.error);
