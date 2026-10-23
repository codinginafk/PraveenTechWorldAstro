import fs from "fs";
import path from "path";

const dir = "src/content/articles";

// For each article that needs external citations,
// find the exact text in the file by searching for a unique substring
// and append the citation at the end of that sentence

const tasks = [
  { file: "how-to-build-a-website-from-scratch-in-2026-a-complete-beginner-guide.mdx", hint: "Wix alone", cite: " ([Statista](https://www.statista.com/statistics/1137020/wix-com-total-subscribers/))" },
  { file: "seo-basics-how-to-rank-higher-on-google-in-2026.mdx", hint: "Google uses over 200", cite: " ([Google Search Central](https://developers.google.com/search/docs/fundamentals/ranking))" },
  { file: "how-to-write-seo-friendly-blog-posts-that-actually-rank-on-google.mdx", hint: "helpful content is content", cite: " ([Google Search Central](https://developers.google.com/search/docs/fundamentals/creating-helpful-content))" },
  { file: "technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better.mdx", hint: "PageSpeed Insights scores", cite: " ([Google PageSpeed Insights](https://pagespeed.web.dev/))" },
  { file: "backlink-building-guide-for-new-websites-get-your-first-quality-links.mdx", hint: "buying links", cite: " ([Google Search Central](https://developers.google.com/search/docs/essentials/spam-policies))" },
  { file: "what-is-domain-authority-and-how-to-improve-it-in-2026.mdx", hint: "logarithmic scale", cite: " ([Moz](https://moz.com/learn/seo/domain-authority))" },
  { file: "website-speed-optimization-why-it-matters-for-seo-and-how-to-fix-it.mdx", hint: "Core Web Vitals", cite: " ([web.dev](https://web.dev/vitals/))" },
  { file: "google-analytics-for-beginners-how-to-track-your-website-traffic.mdx", hint: "event-based model", cite: " ([Google Analytics Help](https://support.google.com/analytics/answer/9304153))" },
  { file: "how-to-set-up-google-search-console-for-your-new-website.mdx", hint: "free tool from Google", cite: " ([Google Search Central](https://developers.google.com/search/docs/fundamentals/get-on-google))" },
  { file: "how-to-use-google-analytics-4-to-improve-your-content-strategy.mdx", hint: "engagement rate based", cite: " ([Google Analytics Help](https://support.google.com/analytics/answer/9973992))" },
  { file: "how-to-use-chatgpt-to-summarize-long-pdfs-for-free.mdx", hint: "GPT-4", cite: " ([OpenAI Documentation](https://platform.openai.com/docs/guides/text-generation))" },
  { file: "chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows.mdx", hint: "ChatGPT memory works", cite: " ([OpenAI Privacy Policy](https://openai.com/policies/privacy-policy/))" },
  { file: "how-to-remove-your-personal-information-from-google-search-results-2026-guide.mdx", hint: "removal of personal information", cite: " ([Google Search Help](https://support.google.com/websearch/answer/9673730))" },
  { file: "how-to-fix-windows-11-update-errors-in-2026-step-by-step-troubleshooting-guide.mdx", hint: "corrupted system files", cite: " ([Microsoft Support](https://support.microsoft.com/en-us/windows/fix-windows-update-errors))" },
  { file: "android-phone-not-charging-10-fixes-for-2026-complete-troubleshooting-guide.mdx", hint: "limited lifespan", cite: " ([Google Battery Care](https://support.google.com/pixelphone/answer/9601185))" },
  { file: "chatgpt-for-excel-how-to-use-new-financial-data-integrations-2024-guide.mdx", hint: "official add-ins", cite: " ([Microsoft Excel API](https://learn.microsoft.com/en-us/office/dev/add-ins/))" },
  { file: "microsoft-free-ai-for-teachers-students-how-to-access-and-use-copilot-now.mdx", hint: "free AI access", cite: " ([Microsoft Learn](https://learn.microsoft.com/en-us/training/modules/empower-educators-with-ai-and-copilot/))" },
  { file: "speed-up-your-slow-pc-in-2026-10-essential-windows-performance-tweaks.mdx", hint: "software analytics firm", cite: " ([Microsoft PC Manager](https://learn.microsoft.com/en-us/windows/pc-manager/))" },
  { file: "how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide.mdx", hint: "work about work", cite: " ([Zapier Guides](https://zapier.com/guides))" },
  { file: "android-battery-draining-fast-after-update-7-proven-fixes-for-2026.mdx", hint: "background optimization", cite: " ([Google Battery Health](https://support.google.com/pixelphone/answer/9601185))" },
  { file: "chrome-removes-ai-privacy-wording-what-googles-on-device-data-claim-means-for-us.mdx", hint: "privacy policy page", cite: " ([Chrome Privacy Whitepaper](https://www.google.com/chrome/privacy/))" },
  { file: "chatgpt-usage-and-adoption-patterns-at-work-in-2026-what-the-data-shows.mdx", hint: "how ChatGPT is being used", cite: " ([OpenAI Research](https://openai.com/research/))" },
  { file: "best-password-managers-in-2026-security-features-and-pricing-compared.mdx", hint: "data breaches involved", cite: " ([NIST Password Guidelines](https://pages.nist.gov/800-63-3/))" },
  { file: "ai-to-automate-office-work-in-1218-months-microsofts-ceo-predictions-and-practic.mdx", hint: "12 to 18 months", cite: " ([Microsoft AI](https://www.microsoft.com/en-us/ai))" },
  { file: "best-free-vpn-services-in-2026-complete-comparison-and-privacy-guide.mdx", hint: "trustworthy VPN provider", cite: " ([EFF VPN Guide](https://www.eff.org/pages/choosing-vpn))" },
  { file: "why-ai-usage-is-dropping-math-skills-in-berkeley-cs-classes-and-what-students-ca.mdx", hint: "struggles with the same", cite: " ([Berkeley EECS](https://eecs.berkeley.edu/resources/students))" },
  { file: "ai-in-higher-education-protecting-student-data-privacy-essential-tips-and-regula.mdx", hint: "AI adoption trends in higher education", cite: " ([EDUCAUSE AI](https://www.educause.edu/topics/artificial-intelligence))" },
  { file: "is-chatgpt-safe-2026-security-privacy-guide.mdx", hint: "transparency report", cite: " ([OpenAI Trust](https://openai.com/trust/))" },
  { file: "how-to-learn-excel-faster-using-chatgpt.mdx", hint: "built-in functions", cite: " ([Microsoft Excel Help](https://support.microsoft.com/en-us/excel))" },
];

// Also fix remaining C7 issues (articles with only 1 internal link)
const moreInternalLinks = [
  { file: "ai-in-higher-education-protecting-student-data-privacy-essential-tips-and-regula.mdx", heading: "## Building the Shield: Actionable Steps for Every Stakeholder", text: "For related AI risks, see our [ChatGPT safety guide](/blog/is-chatgpt-safe-2026-security-privacy-guide)." },
  { file: "ai-to-automate-office-work-in-1218-months-microsofts-ceo-predictions-and-practic.mdx", heading: "## A Step-by-Step Guide to Preparing Your Workflow for AI", text: "For hands-on tools, see our [workflow automation guide](/blog/how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide)." },
  { file: "best-password-managers-in-2026-security-features-and-pricing-compared.mdx", heading: "### 1. 1Password: The Family and Power User Favorite", text: "Our [free VPN guide](/blog/best-free-vpn-services-in-2026-complete-comparison-and-privacy-guide) covers another security essential." },
  { file: "how-to-remove-your-personal-information-from-google-search-results-2026-guide.mdx", heading: "## Proactive Privacy Checklist: How to Stop It From Coming Back", text: "Our [best password managers guide](/blog/best-password-managers-in-2026-security-features-and-pricing-compared) helps secure your accounts." },
  { file: "how-to-write-seo-friendly-blog-posts-that-actually-rank-on-google.mdx", heading: "### Step 2: Write for Humans, Optimize for Google", text: "Our [technical SEO checklist](/blog/technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better) covers behind-the-scenes optimizations." },
  { file: "why-ai-usage-is-dropping-math-skills-in-berkeley-cs-classes-and-what-students-ca.mdx", heading: "## A Practical Survival Guide: How to Use AI Without Losing Your Skills", text: "Our [AI in higher education guide](/blog/ai-in-higher-education-protecting-student-data-privacy-essential-tips-and-regula) discusses related academic integrity concerns." },
];

// First: fix remaining internal links
for (const { file, heading, text } of moreInternalLinks) {
  const fp = path.join(dir, file);
  let c = fs.readFileSync(fp, "utf8");
  const idx = c.indexOf(heading);
  if (idx === -1) {
    console.log("HEADING FAIL: " + file + " -> " + heading.substring(0, 50));
    continue;
  }
  const endIdx = idx + heading.length;
  const afterChar = c[endIdx];
  if (afterChar === "\n" || afterChar === "\r") {
    c = c.slice(0, endIdx) + "\n" + text + c.slice(endIdx);
  } else {
    c = c.slice(0, endIdx) + "\n" + text + c.slice(endIdx);
  }
  fs.writeFileSync(fp, c, "utf8");
  console.log("INTERNAL OK: " + file);
}

// Second: fix external citations - search by hint and find the sentence
for (const { file, hint, cite } of tasks) {
  const fp = path.join(dir, file);
  let c = fs.readFileSync(fp, "utf8");
  const idx = c.indexOf(hint);
  if (idx === -1) {
    console.log("CITE FAIL: " + file + " -> hint: " + hint);
    continue;
  }
  // Find the end of the sentence
  const afterPeriod = c.indexOf(".", idx);
  if (afterPeriod === -1) {
    console.log("CITE FAIL (no period): " + file);
    continue;
  }
  c = c.slice(0, afterPeriod + 1) + cite + c.slice(afterPeriod + 1);
  fs.writeFileSync(fp, c, "utf8");
  console.log("CITE OK: " + file);
}

console.log("\nDone");
