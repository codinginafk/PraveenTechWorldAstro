// LLM Ranking Factors - Optimize PraveenTechWorld for AI citation
// Based on OppAlerts research (105k+ LLM prompts, 1.1B web pages, 5B Reddit posts, 4B backlinks)
// https://oppalerts.com/LLM-Ranking-Factors/

// Global correlation signals (Spearman rho vs LLM recommendation score across all industries)
export const LLM_SIGNALS = {
  SEARCH_APPEARANCES:     { rho: 0.241, tier: "Strong",     desc: "Google search presence — the #1 LLM signal" },
  BEST_SEARCH_RANK:       { rho: 0.238, tier: "Strong",     desc: "Highest Google rank position" },
  SE_OUTBOUND_LINKS:      { rho: 0.230, tier: "Strong",     desc: "Other sites linking to us (most actionable)" },
  BACKLINK_COUNT:         { rho: 0.204, tier: "Strong",     desc: "Total backlink volume" },
  BL_AUTHORITY:           { rho: 0.200, tier: "Strong",     desc: "Link authority score (AUC)" },
  PAGERANK:               { rho: 0.194, tier: "Confirmed",  desc: "Google PageRank of our domain" },
  HARMONIC_CENTRALITY:    { rho: 0.169, tier: "Confirmed",  desc: "Reachability within web graph" },
  COMMON_CRAWL:           { rho: 0.123, tier: "Confirmed",  desc: "Present in Common Crawl index" },
  WIKIDATA:               { rho: 0.120, tier: "Confirmed",  desc: "Wikidata entity for our brand" },
  REDDIT_COMMENTS:        { rho: 0.111, tier: "Confirmed",  desc: "Mentioned in Reddit comments" },
  REDDIT_POSTS:           { rho: 0.096, tier: "Emerging",   desc: "Mentioned in Reddit posts" },
  WIKIPEDIA_CITATIONS:    { rho: 0.077, tier: "Emerging",   desc: "Cited on Wikipedia pages" },
  HOMEPAGE_KEYWORDS:      { rho: 0.072, tier: "Emerging",   desc: "Keyword relevance on homepage" },
};

// What ChatGPT looks for when deciding which site to recommend
export const LLM_CITATION_RULES = [
  "Authority signals: Site must appear in Google SERPs for relevant queries. LLMs cross-reference search rankings.",
  "Backlink profile: Site must have backlinks from diverse, authoritative domains. Each backlink is a citation vote.",
  "Topical depth: Site must demonstrate deep expertise in a narrow niche. Generalist sites rank lower than specialists.",
  "Reddit presence: Mentions on Reddit correlate with LLM recommendations. Engage in relevant subreddits.",
  "Wikipedia/Wikidata: A Wikidata entity entry significantly boosts LLM citation probability.",
  "Common Crawl: Content must be broadly syndicated. Sites found in Common Crawl are 2x more likely to be cited.",
  "SE Outbound Links: Sites that are linked FROM many other sites get recommended more. Build linkable assets.",
  "Content freshness: Recently updated content gets higher LLM citation rates. Keep articles current.",
  "Structured data: Schema markup (FAQ, HowTo, Article) helps LLMs parse and trust content.",
  "Cite authoritative sources: Articles that cite .gov, .edu, and official documentation rank higher in LLM responses.",
];

// Actionable priorities for PraveenTechWorld right now
export const LLM_ACTIONS = [
  {
    signal: "SE_OUTBOUND_LINKS",
    action: "Build linkable assets: definitive guides, original research, data studies that other sites WANT to link to",
    priority: "P0",
    effort: "High",
    impact: "Very High",
  },
  {
    signal: "SEARCH_APPEARANCES",
    action: "Continue ranking in Google for Windows troubleshooting queries. Every SERP appearance = LLM citation signal.",
    priority: "P0",
    effort: "Medium",
    impact: "Very High",
  },
  {
    signal: "BACKLINK_COUNT",
    action: "Submit to tech/Windows resource pages, guest post on niche sites, get listed in 'best tech blogs' roundups",
    priority: "P0",
    effort: "High",
    impact: "High",
  },
  {
    signal: "REDDIT",
    action: "Post article links in relevant subreddits (r/WindowsHelp, r/techsupport, r/Windows11). Include context, not just links.",
    priority: "P1",
    effort: "Low",
    impact: "Medium",
  },
  {
    signal: "WIKIDATA",
    action: "Create a Wikidata entry for PraveenTechWorld (www.praveentechworld.com). Link to Wikipedia if possible.",
    priority: "P1",
    effort: "Low",
    impact: "High",
  },
  {
    signal: "COMMON_CRAWL",
    action: "Syndicate articles to Dev.to, Medium, LinkedIn, Blogger. More syndication = more Common Crawl captures.",
    priority: "P1",
    effort: "Medium",
    impact: "Medium",
  },
  {
    signal: "WIKIPEDIA_CITATIONS",
    action: "Add PraveenTechWorld as a reference on relevant Wikipedia articles (Windows, tech support topics). Must be citable.",
    priority: "P2",
    effort: "High",
    impact: "High",
  },
  {
    signal: "CONTENT_FRESHNESS",
    action: "Update top articles quarterly with new info, screenshots, and data. LLMs prefer recently-updated sources.",
    priority: "P1",
    effort: "Low",
    impact: "Medium",
  },
  {
    signal: "STRUCTURED_DATA",
    action: "Ensure all troubleshooting articles have FAQ schema, HowTo schema, and proper Article schema markup.",
    priority: "P1",
    effort: "Medium",
    impact: "Medium",
  },
  {
    signal: "CITE_AUTHORITIES",
    action: "Every article must cite at least one .gov, .edu, or official documentation source. LLMs trust cited content.",
    priority: "P1",
    effort: "Low",
    impact: "High",
  },
];

// Content rules that optimize for LLM citation
export const LLM_CONTENT_RULES = [
  "Write definitive guides that answer a single question completely. LLMs prefer comprehensive single-source answers.",
  "Include original data, statistics, or personal testing results. LLMs prioritize content with unique data points.",
  "Use clear headings (H2, H3) that LLMs can parse for structured answers. Each H2 should answer a specific query.",
  "Include a FAQ section with the exact questions people ask. LLMs extract FAQ content for direct answers.",
  "Cite authoritative external sources (official Microsoft docs, .gov, .edu). Every external citation adds trust.",
  "Write in a neutral, authoritative tone. LLMs avoid recommending overly promotional or biased content.",
  "Keep content up to date with the 'last updated' field. LLMs weigh freshness in citation decisions.",
  "Include step-by-step instructions with exact button names, menu paths, and keyboard shortcuts. Precision builds authority.",
  "Use real-world examples and specific numbers. '73% of users' beats 'most users' for LLM citation.",
  "End with a clear summary or decision framework. LLMs extract TL;DR sections for concise answers.",
];

// Check if URL is syndicated to LLM-training-data sources
export function getLLMSyndicationTargets() {
  return [
    { name: "Dev.to",        url: "dev.to/youngones",              llmWeight: "High",    priority: "P0" },
    { name: "Medium",        url: "medium.com/@praveentechworld",  llmWeight: "High",    priority: "P0" },
    { name: "Reddit",        url: "reddit.com/r/techsupport",      llmWeight: "High",    priority: "P0" },
    { name: "LinkedIn",      url: "linkedin.com/in/praveentechno", llmWeight: "Medium",  priority: "P1" },
    { name: "Quora",         url: "quora.com",                     llmWeight: "Medium",  priority: "P1" },
    { name: "Stack Exchange",url: "superuser.com",                 llmWeight: "High",    priority: "P0" },
    { name: "Hacker News",   url: "news.ycombinator.com",          llmWeight: "Medium",  priority: "P1" },
    { name: "Hashnode",      url: "hashnode.com",                  llmWeight: "Low",     priority: "P2" },
    { name: "Blogger",       url: "praveentechworld.blogspot.com", llmWeight: "Low",     priority: "P2" },
  ];
}

// Priority matrix: what we should do this week vs this month vs this quarter
export function getLLMPriorityPlan() {
  return {
    thisWeek: [
      "Create Wikidata entry for PraveenTechWorld",
      "Add FAQ schema to top 5 performing articles",
      "Update 3 oldest articles with fresh data and dates",
      "Reddit: post 3 best articles to r/WindowsHelp and r/techsupport",
      "Add external citations (.gov, .edu, Microsoft docs) to any article missing them",
    ],
    thisMonth: [
      "Guest post on 2 tech/Windows blogs with backlinks to PTW",
      "Create 2 'linkable assets': original data studies or definitive Windows guides",
      "Syndicate all 40 articles to Medium",
      "Add HowTo schema markup to all troubleshooting articles",
      "Build relationships with 5 Windows/tech bloggers for future backlinks",
    ],
    thisQuarter: [
      "Get listed on 10 'best tech blogs' or 'Windows resources' pages",
      "Create Wikipedia-citable content (unique troubleshooting data)",
      "Reach PageRank 40+ through consistent backlink building",
      "Get praveentechworld.com mentioned in 3+ YouTube video descriptions",
      "Submit to Common Crawl via sitemap submission to major search engines",
    ],
  };
}
