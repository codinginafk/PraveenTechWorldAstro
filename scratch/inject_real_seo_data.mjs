import { insertSignal, getMemoryDashboard } from '../scripts/seo_memory.mjs';

const realData = [
  {
    source: "google_search_central",
    sourceUrl: "https://developers.google.com/search/updates/core-updates",
    category: "algorithm_update",
    confidence: 1.0,
    text: "May 2026 Broad Core Update (May 21 - June 2) explicitly rewards brands, official sources, and data-rich destinations. Sites that merely compile or summarize content from elsewhere are heavily penalized."
  },
  {
    source: "google_search_central",
    sourceUrl: "https://developers.google.com/search/updates/core-updates",
    category: "ranking_factor",
    confidence: 1.0,
    text: "As of the March 2026 Core Update, 'Information Gain' is explicitly a ranking signal. Google directly evaluates whether a page contributes genuinely new information versus rephrasing what already ranks."
  },
  {
    source: "search_engine_roundtable",
    sourceUrl: "https://www.seroundtable.com",
    category: "ai_content",
    confidence: 1.0,
    text: "AI-specific chunking, 'llms.txt' files, and rewriting content specifically for AI systems are unnecessary. Focus on original evidence and real firsthand data over generic tutorials and special AI-markup tricks."
  },
  {
    source: "google_search_central",
    sourceUrl: "https://search.google.com/search-console",
    category: "technical_seo",
    confidence: 1.0,
    text: "New Search Console AI-visibility reports rolled out starting June 3, 2026. Impressions inside AI Overviews and AI Mode are now visible directly and should be monitored."
  }
];

console.log("Injecting verified SEO data...");
for (const signal of realData) {
  const inserted = insertSignal(signal);
  console.log(`[${inserted ? 'INSERTED' : 'DEDUPLICATED'}] ${signal.text.substring(0, 80)}...`);
}

console.log("\n=== Dashboard After Injection ===");
const d = getMemoryDashboard();
console.log(`Total: ${d.total} | Active: ${d.active}`);
console.log(d.bySource);
