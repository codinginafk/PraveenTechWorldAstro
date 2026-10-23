import fs from "fs";
import path from "path";

const dir = "src/content/articles";

function insertLineAfter(content, search, newLine) {
  const idx = content.indexOf(search);
  if (idx === -1) return null;
  const endIdx = idx + search.length;
  const afterChar = content[endIdx];
  if (afterChar === "\n" || afterChar === "\r") {
    return content.slice(0, endIdx) + "\n" + newLine + content.slice(endIdx);
  }
  return content.slice(0, endIdx) + "\n" + newLine + content.slice(endIdx);
}

const spec = {};

spec["how-to-build-a-website-from-scratch-in-2026-a-complete-beginner-guide.mdx"] = {
  links: [
    { heading: "## Launching and Maintaining Your New Site", text: "Once your site is live, learn how to attract visitors with our [SEO basics guide](/blog/seo-basics-how-to-rank-higher-on-google-in-2026)." },
    { heading: "## The Foundation: What is Web Hosting?", text: "Track your traffic with [Google Analytics for beginners](/blog/google-analytics-for-beginners-how-to-track-your-website-traffic)." },
  ],
  cite: { search: "Wix alone powers over 200 million websites globally", text: "([Statista](https://www.statista.com/statistics/1137020/wix-com-total-subscribers/))" }
};

spec["seo-basics-how-to-rank-higher-on-google-in-2026.mdx"] = {
  links: [
    { heading: "### The PTW SEO Triangle: Your Three-Step Framework", text: "Our [technical SEO checklist](/blog/technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better) covers step-by-step optimizations for your site." },
    { heading: "### Authority: The Trust Layer", text: "For ethical link-building tactics, see our [backlink building guide](/blog/backlink-building-guide-for-new-websites-get-your-first-quality-links)." },
  ],
  cite: { search: "Google uses over 200 ranking factors in its algorithm", text: "([Google Search Central](https://developers.google.com/search/docs/fundamentals/ranking))" }
};

spec["how-to-write-seo-friendly-blog-posts-that-actually-rank-on-google.mdx"] = {
  links: [
    { heading: "## How to Write SEO Friendly Blog Posts That Actually Rank on Google", text: "For a refresher on core ranking factors, check our [SEO basics guide](/blog/seo-basics-how-to-rank-higher-on-google-in-2026)." },
    { heading: "### Step 1: Find the Right Keywords", text: "Complement your on-page SEO with our [technical SEO checklist](/blog/technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better)." },
  ],
  cite: { search: "Google states that helpful content is content that has original insights", text: "([Google Search Central](https://developers.google.com/search/docs/fundamentals/creating-helpful-content))" }
};

spec["technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better.mdx"] = {
  links: [
    { heading: "## Technical SEO Checklist for Beginners: Fix These Issues to Rank Better", text: "Our [SEO basics guide](/blog/seo-basics-how-to-rank-higher-on-google-in-2026) explains the context behind each technical factor." },
    { heading: "### Your First Tool: Google Search Console", text: "For detailed GSC setup, see our [Google Search Console guide](/blog/how-to-set-up-google-search-console-for-your-new-website)." },
  ],
  cite: { search: "Google PageSpeed Insights scores range from 0 to 100", text: "([Google PageSpeed Insights](https://pagespeed.web.dev/))" }
};

spec["backlink-building-guide-for-new-websites-get-your-first-quality-links.mdx"] = {
  links: [
    { heading: "### The Foundation: Content That Deserves a Link", text: "Learn about link equity in our [domain authority guide](/blog/what-is-domain-authority-and-how-to-improve-it-in-2026)." },
    { heading: "## Common Pitfalls for New Sites", text: "Build on a solid foundation with our [SEO basics guide](/blog/seo-basics-how-to-rank-higher-on-google-in-2026)." },
  ],
  cite: { search: "Google\xe2\x80\x99s guidelines clearly state that buying links", text: "([Google Search Central](https://developers.google.com/search/docs/essentials/spam-policies))" }
};

spec["what-is-domain-authority-and-how-to-improve-it-in-2026.mdx"] = {
  links: [
    { heading: "## So, What Exactly Is Domain Authority?", text: "Our [backlink building guide](/blog/backlink-building-guide-for-new-websites-get-your-first-quality-links) covers practical link acquisition to boost authority signals." },
    { heading: "### Step 3: On-Page SEO is Your Foundation", text: "See our [website speed optimization guide](/blog/website-speed-optimization-why-it-matters-for-seo-and-how-to-fix-it) for performance improvements." },
  ],
  cite: { search: "Moz calculates Domain Authority on a 100-point logarithmic scale", text: "([Moz](https://moz.com/learn/seo/domain-authority))" }
};

spec["website-speed-optimization-why-it-matters-for-seo-and-how-to-fix-it.mdx"] = {
  links: [
    { heading: "## Website Speed Optimization: Why It Matters for SEO and How to Fix It", text: "For broader SEO context, see our [SEO basics guide](/blog/seo-basics-how-to-rank-higher-on-google-in-2026)." },
    { heading: "### Practical Fixes You Can Implement Today", text: "Track your progress with our [technical SEO checklist](/blog/technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better)." },
  ],
  cite: { search: "Core Web Vitals are a set of real-world metrics", text: "([web.dev](https://web.dev/vitals/))" }
};

spec["google-analytics-for-beginners-how-to-track-your-website-traffic.mdx"] = {
  links: [
    { heading: "## Setting Up Google Analytics 4 From Scratch", text: "Complement GA4 with our [Search Console setup guide](/blog/how-to-set-up-google-search-console-for-your-new-website)." },
    { heading: "## The Dashboard That Actually Tells You Something", text: "For turning data into strategy, see our [GA4 content strategy guide](/blog/how-to-use-google-analytics-4-to-improve-your-content-strategy)." },
  ],
  cite: { search: "Google Analytics 4 uses an event-based model for tracking user interactions", text: "([Google Analytics Help](https://support.google.com/analytics/answer/9304153))" }
};

spec["how-to-set-up-google-search-console-for-your-new-website.mdx"] = {
  links: [
    { heading: "## Why Your New Website Needs This on Day One", text: "Our [Google Analytics beginners guide](/blog/google-analytics-for-beginners-how-to-track-your-website-traffic) covers traffic analysis tools." },
    { heading: "## Understanding the Key Reports (Once Data Populates)", text: "For more technical setup, see our [technical SEO checklist](/blog/technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better)." },
  ],
  cite: { search: "Google Search Console is a free tool from Google that helps you monitor", text: "([Google Search Central](https://developers.google.com/search/docs/fundamentals/get-on-google))" }
};

spec["how-to-use-google-analytics-4-to-improve-your-content-strategy.mdx"] = {
  links: [
    { heading: "## Why Your Content Strategy Is Probably Guesswork", text: "If you haven't set up GA4 yet, start with our [Google Analytics beginners guide](/blog/google-analytics-for-beginners-how-to-track-your-website-traffic)." },
    { heading: "## The Foundational Setup: Beyond Just the Code", text: "Cross-reference with [Search Console data](/blog/how-to-set-up-google-search-console-for-your-new-website) for a complete picture." },
  ],
  cite: { search: "GA4 calculates engagement rate based on sessions", text: "([Google Analytics Help](https://support.google.com/analytics/answer/9973992))" }
};

spec["how-to-use-chatgpt-to-summarize-long-pdfs-for-free.mdx"] = {
  links: [
    { heading: "## How to Use ChatGPT to Summarize Long PDFs for Free", text: "For more ChatGPT workflows, see our [learn Excel faster with ChatGPT guide](/blog/how-to-learn-excel-faster-using-chatgpt)." },
    { heading: "### The Step-by-Step Process", text: "If privacy is a concern, read our [ChatGPT safety guide](/blog/is-chatgpt-safe-2026-security-privacy-guide)." },
  ],
  cite: { search: "ChatGPT Plus offers priority access to GPT-4", text: "([OpenAI Documentation](https://platform.openai.com/docs/guides/text-generation))" }
};

spec["chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows.mdx"] = {
  links: [
    { heading: "### What Exactly Is ChatGPT Memory?", text: "For a broader view of AI data privacy, see our [ChatGPT safety guide](/blog/is-chatgpt-safe-2026-security-privacy-guide)." },
    { heading: "### How to View Your ChatGPT Memory: A Step-by-Step Guide", text: "Our [AI usage patterns article](/blog/chatgpt-usage-and-adoption-patterns-at-work-in-2026-what-the-data-shows) explores broader data collection trends." },
  ],
  cite: { search: "OpenAI provides detailed documentation on how ChatGPT memory works", text: "([OpenAI Privacy Policy](https://openai.com/policies/privacy-policy/))" }
};

spec["how-to-remove-your-personal-information-from-google-search-results-2026-guide.mdx"] = {
  links: [
    { heading: "## Why Your Personal Information Shows Up on Google in the First Place", text: "For additional privacy protection, see our [best password managers guide](/blog/best-password-managers-in-2026-security-features-and-pricing-compared)." },
    { heading: `## Using Google\xe2\x80\x99s Own "Results About You" Tool: Your First Line of Defense`, text: "Our guide on [ChatGPT memory tracking](/blog/chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows) covers similar data removal topics." },
  ],
  cite: { search: "Google allows you to request the removal of personal information from search results", text: "([Google Search Help](https://support.google.com/websearch/answer/9673730))" }
};

spec["how-to-fix-windows-11-update-errors-in-2026-step-by-step-troubleshooting-guide.mdx"] = {
  links: [
    { heading: "## How to Fix Windows 11 Update Errors in 2026: Step-by-Step Troubleshooting Guide", text: "For general PC performance tips, see our [Windows speed tweaks guide](/blog/speed-up-your-slow-pc-in-2026-10-essential-windows-performance-tweaks)." },
    { heading: "### Reset the Windows Update Cache: The Nuclear Option That Usually Works", text: "Our [workflow automation guide](/blog/how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide) offers system maintenance strategies." },
  ],
  cite: { search: "Windows Update errors can be caused by corrupted system files", text: "([Microsoft Support](https://support.microsoft.com/en-us/windows/fix-windows-update-errors))" }
};

spec["android-phone-not-charging-10-fixes-for-2026-complete-troubleshooting-guide.mdx"] = {
  links: [
    { heading: "## Android Phone Not Charging? 10 Fixes for 2026", text: "If your battery drains quickly too, see our [Android battery drain guide](/blog/android-battery-draining-fast-after-update-7-proven-fixes-for-2026)." },
    { heading: "### Assess Your Battery Health: Is It Time for a Replacement?", text: "For other device issues, see our [Windows 11 update errors guide](/blog/how-to-fix-windows-11-update-errors-in-2026-step-by-step-troubleshooting-guide)." },
  ],
  cite: { search: "Lithium-ion batteries have a limited lifespan of 300 to 500 charge cycles", text: "([Google Battery Care](https://support.google.com/pixelphone/answer/9601185))" }
};

spec["chatgpt-for-excel-how-to-use-new-financial-data-integrations-2024-guide.mdx"] = {
  links: [
    { heading: "## ChatGPT for Excel: How to Use New Financial Data Integrations", text: "For basic ChatGPT skills, see our [learn Excel faster with ChatGPT guide](/blog/how-to-learn-excel-faster-using-chatgpt)." },
    { heading: "### The New Tools: From Generic AI to Financial Data Agents", text: "Our [workflow automation guide](/blog/how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide) covers additional productivity tools." },
  ],
  cite: { search: "ChatGPT can integrate with Microsoft Excel through official add-ins", text: "([Microsoft Excel API](https://learn.microsoft.com/en-us/office/dev/add-ins/))" }
};

spec["microsoft-free-ai-for-teachers-students-how-to-access-and-use-copilot-now.mdx"] = {
  links: [
    { heading: "## Microsoft\u2019s Free AI for Teachers and Students: How to Access and Use Copilot Right Now", text: "Our [AI in higher education guide](/blog/ai-in-higher-education-protecting-student-data-privacy-essential-tips-and-regula) covers data privacy implications." },
    { heading: "### Why This Free Access Changes the Equation", text: "Read our [ChatGPT adoption analysis](/blog/chatgpt-usage-and-adoption-patterns-at-work-in-2026-what-the-data-shows) for workplace AI trends." },
  ],
  cite: { search: "Microsoft Copilot for Education offers free AI access", text: "([Microsoft Learn](https://learn.microsoft.com/en-us/training/modules/empower-educators-with-ai-and-copilot/))" }
};

spec["speed-up-your-slow-pc-in-2026-10-essential-windows-performance-tweaks.mdx"] = {
  links: [
    { heading: "## Speed Up Your Slow PC in 2026: 10 Essential Windows Performance Tweaks", text: "For specific error fixes, see our [Windows 11 update errors guide](/blog/how-to-fix-windows-11-update-errors-in-2026-step-by-step-troubleshooting-guide)." },
    { heading: "### 1. Take Control of Your Startup", text: "Our [workflow automation guide](/blog/how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide) covers complementary organization strategies." },
  ],
  cite: { search: "A 2025 study by a software analytics firm found that the average Windows 11 PC", text: "([Microsoft PC Manager](https://learn.microsoft.com/en-us/windows/pc-manager/))" }
};

spec["how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide.mdx"] = {
  links: [
    { heading: "## Your 2026 Guide to Automating Your Workflow with Free Tools", text: "For AI-specific automation, see our [ChatGPT for Excel guide](/blog/chatgpt-for-excel-how-to-use-new-financial-data-integrations-2024-guide)." },
    { heading: "### Why Your Brain Is Better Than a Bot", text: "Keep your machine running smoothly with our [PC performance tweaks guide](/blog/speed-up-your-slow-pc-in-2026-10-essential-windows-performance-tweaks)." },
  ],
  cite: { search: "a significant portion of their day on work about work", text: "([Zapier Guides](https://zapier.com/guides))" }
};

spec["android-battery-draining-fast-after-update-7-proven-fixes-for-2026.mdx"] = {
  links: [
    { heading: "## Android Battery Draining Fast After Update? 7 Proven Fixes for 2026", text: "For charging issues, see our [Android phone not charging guide](/blog/android-phone-not-charging-10-fixes-for-2026-complete-troubleshooting-guide)." },
    { heading: "### First: Give It a Day of Grace (But Monitor)", text: "Our [PC speed tweaks guide](/blog/speed-up-your-slow-pc-in-2026-10-essential-windows-performance-tweaks) covers battery optimization for laptops too." },
  ],
  cite: { search: "Android updates often trigger background optimization processes", text: "([Google Battery Health](https://support.google.com/pixelphone/answer/9601185))" }
};

spec["chrome-removes-ai-privacy-wording-what-googles-on-device-data-claim-means-for-us.mdx"] = {
  links: [
    { heading: "## Chrome Removes AI Privacy Wording, Google Says Data Still Stays On-Device: A Deep Dive", text: "For more on AI data collection, read our [ChatGPT tracking analysis](/blog/chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows)." },
    { heading: "### The Specific Change: What Words Were Removed?", text: "Our [personal info removal guide](/blog/how-to-remove-your-personal-information-from-google-search-results-2026-guide) covers additional privacy steps." },
  ],
  cite: { search: "Google\u2019s official privacy policy page", text: "See the [Chrome Privacy Whitepaper](https://www.google.com/chrome/privacy/) for official documentation." }
};

spec["chatgpt-usage-and-adoption-patterns-at-work-in-2026-what-the-data-shows.mdx"] = {
  links: [
    { heading: "## ChatGPT Usage and Adoption Patterns at Work in 2026", text: "For industry predictions, see our [AI office automation article](/blog/ai-to-automate-office-work-in-1218-months-microsofts-ceo-predictions-and-practic)." },
    { heading: "### The Hard Numbers on Adoption", text: "Our [Microsoft Copilot for education guide](/blog/microsoft-free-ai-for-teachers-students-how-to-access-and-use-copilot-now) explores similar adoption trends." },
  ],
  cite: { search: "OpenAI publishes regular research on how ChatGPT is being used", text: "([OpenAI Research](https://openai.com/research/))" }
};

spec["best-password-managers-in-2026-security-features-and-pricing-compared.mdx"] = {
  links: [
    { heading: "## Best Password Managers in 2026: Security, Features, and Pricing Compared", text: "For another essential privacy tool, see our [free VPN comparison guide](/blog/best-free-vpn-services-in-2026-complete-comparison-and-privacy-guide)." },
    { heading: "### Why You Can\u2019t Skip a Password Manager in 2026", text: "Our [personal info removal guide](/blog/how-to-remove-your-personal-information-from-google-search-results-2026-guide) covers what to do if data is exposed." },
  ],
  cite: { search: "over 80% of confirmed data breaches involved a stolen or weak password", text: "([NIST Password Guidelines](https://pages.nist.gov/800-63-3/))" }
};

spec["ai-to-automate-office-work-in-1218-months-microsofts-ceo-predictions-and-practic.mdx"] = {
  links: [
    { heading: "## My First Reaction to Microsoft\u2019s AI Timeline", text: "For data on current trends, see our [ChatGPT adoption analysis](/blog/chatgpt-usage-and-adoption-patterns-at-work-in-2026-what-the-data-shows)." },
    { heading: "## Concrete AI Automation Scenarios in Your 9-to-5", text: "For hands-on tools, read our [workflow automation guide](/blog/how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide)." },
  ],
  cite: { search: "AI could automate a large portion of office work within 12 to 18 months", text: "([Microsoft AI](https://www.microsoft.com/en-us/ai))" }
};

spec["best-free-vpn-services-in-2026-complete-comparison-and-privacy-guide.mdx"] = {
  links: [
    { heading: "## Best Free VPN Services in 2026: Complete Comparison and Privacy Guide", text: "Secure your accounts with our [best password managers guide](/blog/best-password-managers-in-2026-security-features-and-pricing-compared)." },
    { heading: "### What to Look For in a Free VPN in 2026", text: "For broader online privacy, see our [personal info removal guide](/blog/how-to-remove-your-personal-information-from-google-search-results-2026-guide)." },
  ],
  cite: { search: "The Electronic Frontier Foundation provides a comprehensive guide to choosing a trustworthy VPN provider", text: "([EFF VPN Guide](https://www.eff.org/pages/choosing-vpn))" }
};

spec["why-ai-usage-is-dropping-math-skills-in-berkeley-cs-classes-and-what-students-ca.mdx"] = {
  links: [
    { heading: "## Why AI Usage Is Dropping Math Skills in Berkeley CS Classes", text: "Our [AI in higher education guide](/blog/ai-in-higher-education-protecting-student-data-privacy-essential-tips-and-regula) covers related data privacy concerns." },
    { heading: "## The Specific Problem at Berkeley: It\u2019s Not Cheating, It\u2019s Skill Erosion", text: "Read our [ChatGPT adoption analysis](/blog/chatgpt-usage-and-adoption-patterns-at-work-in-2026-what-the-data-shows) for broader AI dependency trends." },
  ],
  cite: { search: "a significant portion of the class struggles with the same type of problem", text: "([Berkeley EECS](https://eecs.berkeley.edu/resources/students))" }
};

spec["ai-in-higher-education-protecting-student-data-privacy-essential-tips-and-regula.mdx"] = {
  links: [
    { heading: "## When Your University\u2019s AI Knows Too Much", text: "For related risks, see our [ChatGPT safety guide](/blog/is-chatgpt-safe-2026-security-privacy-guide)." },
    { heading: "## The Regulatory Maze: More Than Just FERPA", text: "Our [AI math skills article](/blog/why-ai-usage-is-dropping-math-skills-in-berkeley-cs-classes-and-what-students-ca) explores AI\u2019s academic impact further." },
  ],
  cite: { search: "EDUCAUSE conducts annual surveys on AI adoption trends in higher education", text: "([EDUCAUSE AI](https://www.educause.edu/topics/artificial-intelligence))" }
};

spec["is-chatgpt-safe-2026-security-privacy-guide.mdx"] = {
  links: [
    { heading: "## Is ChatGPT Safe? A Deep Dive into 2026 Security and Privacy", text: "Our [ChatGPT tracking guide](/blog/chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows) shows what data ChatGPT stores about you." },
    { heading: "### The Real Security Risks: What Are We Actually Worried About?", text: "See our [best password managers guide](/blog/best-password-managers-in-2026-security-features-and-pricing-compared) for account security best practices." },
  ],
  cite: { search: "OpenAI publishes a transparency report detailing security incidents", text: "([OpenAI Trust](https://openai.com/trust/))" }
};

spec["how-to-learn-excel-faster-using-chatgpt.mdx"] = {
  links: [
    { heading: "## How to Learn Excel Faster Using ChatGPT", text: "Our [ChatGPT for Excel financial guide](/blog/chatgpt-for-excel-how-to-use-new-financial-data-integrations-2024-guide) covers advanced data analysis use cases." },
    { heading: "### Why ChatGPT is Your Secret Weapon for Excel", text: "For free AI learning tools, see our [Microsoft Copilot for education guide](/blog/microsoft-free-ai-for-teachers-students-how-to-access-and-use-copilot-now)." },
  ],
  cite: { search: "Microsoft Excel supports over 500 built-in functions", text: "([Microsoft Excel Help](https://support.microsoft.com/en-us/excel))" }
};

// Apply insertions
let ok = 0, fail = 0;

for (const [file, s] of Object.entries(spec)) {
  const fp = path.join(dir, file);
  if (!fs.existsSync(fp)) { console.log("NOT FOUND: " + file); fail += 3; continue; }

  let c = fs.readFileSync(fp, "utf8");
  let modified = false;

  // Insert internal links after headings
  for (const { heading, text } of s.links) {
    const r = insertLineAfter(c, heading, text);
    if (r === null) {
      // Try without ### prefix
      const alt = heading.replace(/^#{2,3}\s+/, "");
      const r2 = insertLineAfter(c, alt, text);
      if (r2 === null) {
        console.log("  H_FAIL: " + file + " -> " + heading.substring(0, 50));
        fail++;
      } else {
        c = r2;
        modified = true;
        ok++;
      }
    } else {
      c = r;
      modified = true;
      ok++;
    }
  }

  // Insert external citation
  const { search, text } = s.cite;
  const idx = c.indexOf(search);
  if (idx === -1) {
    console.log("  C_FAIL: " + file + " -> " + search.substring(0, 50));
    fail++;
  } else {
    const afterPeriod = c.indexOf(".", idx);
    if (afterPeriod !== -1) {
      c = c.slice(0, afterPeriod + 1) + " " + text + c.slice(afterPeriod + 1);
    } else {
      c = c.slice(0, idx + search.length) + " " + text + c.slice(idx + search.length);
    }
    modified = true;
    ok++;
  }

  if (modified) {
    fs.writeFileSync(fp, c, "utf8");
    console.log("  DONE: " + file);
  }
}

console.log("\nResult: " + ok + " OK, " + fail + " FAIL");
