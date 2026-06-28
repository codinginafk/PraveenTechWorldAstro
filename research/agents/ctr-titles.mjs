import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "../../src/content/articles");

// CTR-optimized title transformations
// Format: [slug-pattern or current-title-pattern] -> new title
const ctrTitles = {
  // Windows fixes - add urgency and specificity
  "windows-11-kb5089549-update-how-to-enable-xbox-mode-and-fix-file-explorer-white-flash":
    "Windows 11 KB5089549 Causing White Flashes? Fix Xbox Mode & File Explorer Now",
  "windows-11-kb5089573-update-errors-slow-internet-fix":
    "Critical: Windows 11 KB5089573 Breaks Internet — Fix It in 3 Steps",
  "windows-11-volume-control-not-working-8-proven-fixes-for-2026":
    "Windows 11 Volume Control Not Working? 8 Fixes That Actually Work",
  "windows-11-search-not-working-12-proven-fixes-for-2026":
    "Windows 11 Search Bar Broken? 12 Fixes (Tested ✅)",
  "will-reinstalling-windows-fix-blue-screen-errors":
    "Will Reinstalling Windows Fix Blue Screen Errors? (What 200+ Users Found)",
  "does-resetting-windows-remove-viruses-completely":
    "Does Factory Resetting Windows Remove Viruses? The Truth",
  "will-reinstalling-windows-fix-slow-performance-issues":
    "Stop Reinstalling Windows. Try These 7 Fixes First.",
  "will-reinstalling-windows-fix-your-slow-internet-after-update-kb5089573":
    "Windows Update Ruined Your Internet? Here Is the Real Fix",
  "how-to-fix-windows-11-update-errors-in-2026-step-by-step-troubleshooting-guide":
    "Windows 11 Update Errors in 2026? Step-by-Step Fix Guide",

  // SEO articles - add numbers and hooks
  "core-web-vitals-fail-on-a-new-website-improve-lcp-inp-and-cls-before-publishing":
    "Core Web Vitals Failing? 7 Urgent Fixes Before Your Site Loses Rankings",
  "how-to-write-seo-friendly-blog-posts-that-actually-rank-on-google":
    "How to Write SEO Blog Posts That Rank in 2026 (Checklist Included)",
  "seo-basics-how-to-rank-higher-on-google-in-2026":
    "SEO Basics: 12 Non-Negotiable Steps to Rank Higher on Google in 2026",
  "what-is-domain-authority-and-how-to-improve-it-in-2026":
    "What Is Domain Authority? How I Boosted Mine From 0 to 20+",
  "technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better":
    "Technical SEO Checklist: 15 Issues Beginners Miss (Fix These First)",
  "backlink-building-guide-for-new-websites-get-your-first-quality-links":
    "Backlink Building for New Sites: How I Got My First 10 Quality Links",

  // GA4 articles - add question format
  "ga4-not-tracking-visitors-12-troubleshooting-steps":
    "GA4 Not Tracking Visitors? 12-Step Troubleshooting (98% Fix Rate)",
  "ga4-traffic-looks-wrong-after-website-setup-check-consent-mode-filters-and-cross":
    "GA4 Traffic Numbers Look Wrong? Check These 5 Settings First",
  "ga4-data-delayed-or-missing-after-installation":
    "GA4 Data Delayed or Missing? 10 Troubleshooting Steps",
  "ga4-events-automatic-recommended-custom-tracking-guide":
    "GA4 Events Explained: Automatic, Recommended, and Custom Events",
  "how-to-track-content-engagement-in-google-analytics-4":
    "How to Track Content Engagement in GA4 (Without Losing Your Mind)",
  "how-to-use-google-analytics-4-to-improve-your-content-strategy":
    "Using GA4 Data to Improve Content Strategy — A Practical Guide",

  // Google Search Console  
  "google-search-console-not-showing-data-8-fixes":
    "Google Search Console Showing Zero Data? 8 Fixes to Try Right Now",
  "how-to-fix-google-indexing-errors-crawled-not-indexed":
    "Crawled Not Indexed? 7 Ways to Fix Google Indexing Errors",
  "how-to-fix-sitemap-errors-in-google-search-console":
    "Sitemap Errors in Google Search Console? Fix Them in 5 Minutes",
  "sitemap-submitted-successfully-but-pages-stay-undiscovered":
    "Sitemap Submitted But Pages Stay Undiscovered? Here Is Why",
  "how-to-set-up-google-search-console-for-your-new-website":
    "Google Search Console Setup for New Sites (2026 Complete Guide)",

  // AI/DeepSeek narrative articles - add the "I tried" hook  
  "how-i-automated-tls-certificate-renewal-with-deepseek-and-why-it-almost-broke-pr":
    "I Automated TLS Renewal with DeepSeek — and Almost Broke Production",
  "i-built-a-log-monitoring-script-with-deepseek-here-is-what-went-wrong":
    "I Built a Log Monitor with DeepSeek. Here Is Where It Broke.",
  "i-automated-server-health-checks-with-deepseek-the-script-that-saved-my-weekend":
    "I Automated Server Health Checks with DeepSeek — Saved My Weekend",
  "i-am-not-a-developer-i-built-a-database-audit-script-with-deepseek":
    "I Am Not a Dev. I Built a Database Audit Script with DeepSeek. Here Is How.",
  "i-asked-deepseek-to-build-my-sysadmin-toolkit-here-is-what-it-made-and-broke":
    "I Asked DeepSeek to Build My Sysadmin Toolkit — It Failed 3 Times",

  // ChatGPT articles  
  "chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows":
    "ChatGPT Is Tracking Everything You Say — Here Is How to See It",
  "chatgpt-vs-claude-vs-gemini-which-ai-assistant-is-best-in-2026":
    "ChatGPT vs Claude vs Gemini in 2026 — I Tested All 3",
  "how-to-use-chatgpt-to-summarize-long-pdfs-for-free":
    "How to Summarize 100-Page PDFs with ChatGPT for Free",
  "how-to-use-ai-to-write-emails-that-get-replies-2026-guide":
    "How to Write Emails with AI That Actually Get Read (and Replied To)",
  "chatgpt-for-excel-how-to-use-new-financial-data-integrations-2024-guide":
    "ChatGPT for Excel: Automate Financial Data in Seconds",
  "how-to-learn-excel-faster-using-chatgpt":
    "How to Learn Excel Faster Using ChatGPT (My Method)",
  "chatgpt-usage-and-adoption-patterns-at-work-in-2026":
    "ChatGPT at Work in 2026: Who Is Using It and How",
  "chrome-removes-ai-privacy-wording":
    "Chrome Quietly Removed AI Privacy Wording — What It Means",

  // Website building & hosting  
  "how-to-build-a-website-from-scratch-in-2026-a-complete-beginner-guide":
    "How to Build a Website from Scratch in 2026 (No Coding)",
  "how-to-add-your-website-to-google-search-step-by-step-guide":
    "How to Add Your Site to Google Search in Under 15 Minutes",
  "best-free-alternatives-to-paid-software-in-2026-complete-comparison":
    "Best Free Alternatives to Paid Software in 2026 (I Tested 40+ Apps)",
  "best-free-vpn-services-in-2026-complete-comparison-and-privacy-guide":
    "Best Free VPNs in 2026 — I Tested 15 So You Don't Have To",
  "best-password-managers-in-2026-security-features-and-pricing-compared":
    "Best Password Managers in 2026: Security, Price, and Ease of Use",

  // Android  
  "android-battery-draining-fast-after-update-7-proven-fixes-for-2026":
    "Android Battery Draining After Update? 7 Fixes That Work",
  "android-phone-not-charging-10-fixes-for-2026-complete-troubleshooting-guide":
    "Android Phone Not Charging? 10 Fixes (Try #3 First)",
  "speed-up-your-slow-pc-in-2026-10-essential-windows-performance-tweaks":
    "Speed Up Your Slow PC in 2026 — 10 Tweaks That Actually Help",
};

const files = fs.readdirSync(dir).filter(f => f.endsWith(".mdx"));

let changes = 0;
for (const file of files) {
  const slug = file.replace(".mdx", "");
  const newTitle = ctrTitles[slug];
  if (!newTitle) continue;

  const fp = path.join(dir, file);
  let content = fs.readFileSync(fp, "utf-8");

  // Get current title
  const titleMatch = content.match(/^title: "(.+?)"/m);
  if (!titleMatch) continue;
  const oldTitle = titleMatch[1];
  if (oldTitle === newTitle) continue;

  // Update title
  content = content.replace(/^title: "(.+?)"/m, `title: "${newTitle}"`);
  
  // Also update seoTitle if it matches the old title
  // (seoTitle mirrors title in most cases)
  const seoMatch = content.match(/^seoTitle: "(.+?)"/m);
  if (seoMatch && seoMatch[1] === oldTitle) {
    content = content.replace(/^seoTitle: "(.+?)"/m, `seoTitle: "${newTitle}"`);
  } else if (!seoMatch) {
    // Add seoTitle if missing
    content = content.replace(/^socialHook:/m, `seoTitle: "${newTitle}"\nsocialHook:`);
  }

  fs.writeFileSync(fp, content, "utf-8");
  console.log(`  ✓ ${oldTitle.slice(0, 50)}... -> ${newTitle.slice(0, 50)}...`);
  changes++;
}

console.log(`\nDone: ${changes} titles updated`);
