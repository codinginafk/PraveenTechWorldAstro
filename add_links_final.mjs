import fs from 'fs';
import path from 'path';

const dir = 'src/content/articles';

function insertAfter(content, search, insert) {
  const idx = content.indexOf(search);
  if (idx === -1) return null;
  return content.slice(0, idx + search.length) + insert + content.slice(idx + search.length);
}

const spec = [
  {
    file: 'how-to-build-a-website-from-scratch-in-2026-a-complete-beginner-guide.mdx',
    inserts: [
      { after: "## Your Website: More Than Just a Digital Business Card", text: " Once your site is live, learn how to attract visitors with our [SEO basics guide](/blog/seo-basics-how-to-rank-higher-on-google-in-2026)." },
      { after: "### Step 3: Design and Build Your Site", text: " Track your traffic with [Google Analytics for beginners](/blog/google-analytics-for-beginners-how-to-track-your-website-traffic)." },
      { after: "Wix alone powers over 200 million websites globally, making it one of the most popular website builders in the world", text: " ([Statista](https://www.statista.com/statistics/1137020/wix-com-total-subscribers/))" },
    ]
  },
  {
    file: 'seo-basics-how-to-rank-higher-on-google-in-2026.mdx',
    inserts: [
      { after: "## The Three Pillars of Modern SEO You Need to Know", text: " Our [technical SEO checklist](/blog/technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better) covers step-by-step optimizations for your site." },
      { after: "## The Foundation: Content, Keywords, and User Intent", text: " For ethical link-building tactics, see our [backlink building guide](/blog/backlink-building-guide-for-new-websites-get-your-first-quality-links)." },
      { after: "Google uses over 200 ranking factors in its algorithm", text: " ([Google Search Central](https://developers.google.com/search/docs/fundamentals/ranking))" },
    ]
  },
  {
    file: 'how-to-write-seo-friendly-blog-posts-that-actually-rank-on-google.mdx',
    inserts: [
      { after: "## How to Write SEO Blog Posts That Actually Rank on Google", text: " For a refresher on core ranking factors, check our [SEO basics guide](/blog/seo-basics-how-to-rank-higher-on-google-in-2026)." },
      { after: "### Keyword Research: Where Every Great SEO Post Starts", text: " Complement your on-page SEO with our [technical SEO checklist](/blog/technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better)." },
      { after: "Google states that helpful content is content that has original insights", text: " ([Google Search Central](https://developers.google.com/search/docs/fundamentals/creating-helpful-content))" },
    ]
  },
  {
    file: 'technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better.mdx',
    inserts: [
      { after: "## The Technical SEO Checklist: Your Step-by-Step Guide", text: " Our [SEO basics guide](/blog/seo-basics-how-to-rank-higher-on-google-in-2026) explains the context behind each technical factor." },
      { after: "### 2. Check Your Site Structure and Navigation", text: " For setup instructions, see our [Google Search Console guide](/blog/how-to-set-up-google-search-console-for-your-new-website)." },
      { after: "Google PageSpeed Insights scores range from 0 to 100", text: " ([Google PageSpeed Insights](https://pagespeed.web.dev/))" },
    ]
  },
  {
    file: 'backlink-building-guide-for-new-websites-get-your-first-quality-links.mdx',
    inserts: [
      { after: "### What Makes a Link Valuable?", text: " Learn about link equity in our [domain authority guide](/blog/what-is-domain-authority-and-how-to-improve-it-in-2026)." },
      { after: "## Common Pitfalls for New Sites", text: " Build on a solid foundation with our [SEO basics guide](/blog/seo-basics-how-to-rank-higher-on-google-in-2026)." },
      { after: "Google's guidelines clearly state that buying links to pass PageRank violates their spam policies", text: " ([Google Search Central](https://developers.google.com/search/docs/essentials/spam-policies))" },
    ]
  },
  {
    file: 'what-is-domain-authority-and-how-to-improve-it-in-2026.mdx',
    inserts: [
      { after: "## What Is Domain Authority?", text: " Our [backlink building guide](/blog/backlink-building-guide-for-new-websites-get-your-first-quality-links) covers link acquisition to boost your authority signals." },
      { after: "### 4. Optimize Your On-Page SEO", text: " See our [website speed optimization guide](/blog/website-speed-optimization-why-it-matters-for-seo-and-how-to-fix-it) for performance improvements." },
      { after: "Moz calculates Domain Authority on a 100-point logarithmic scale", text: " ([Moz](https://moz.com/learn/seo/domain-authority))" },
    ]
  },
  {
    file: 'website-speed-optimization-why-it-matters-for-seo-and-how-to-fix-it.mdx',
    inserts: [
      { after: "## Website Speed Optimization: Why It Matters for SEO and How to Fix It", text: " For broader SEO context, see our [SEO basics guide](/blog/seo-basics-how-to-rank-higher-on-google-in-2026)." },
      { after: "### What to Do After You've Made Changes", text: " Track your progress with our [technical SEO checklist](/blog/technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better)." },
      { after: "Core Web Vitals are a set of real-world metrics that Google considers critical for user experience", text: " ([web.dev](https://web.dev/vitals/))" },
    ]
  },
  {
    file: 'google-analytics-for-beginners-how-to-track-your-website-traffic.mdx',
    inserts: [
      { after: "## Setting Up Google Analytics 4 From Scratch", text: " Complement GA4 with our [Search Console setup guide](/blog/how-to-set-up-google-search-console-for-your-new-website)." },
      { after: "You'll be asked for an Account Name", text: " For turning data into strategy, see our [GA4 content strategy guide](/blog/how-to-use-google-analytics-4-to-improve-your-content-strategy)." },
      { after: "Google Analytics 4 uses an event-based model for tracking user interactions", text: " ([Google Analytics Help](https://support.google.com/analytics/answer/9304153))" },
    ]
  },
  {
    file: 'how-to-set-up-google-search-console-for-your-new-website.mdx',
    inserts: [
      { after: "## Why Your New Website Needs This on Day One", text: " Our [Google Analytics beginners guide](/blog/google-analytics-for-beginners-how-to-track-your-website-traffic) covers traffic analysis tools." },
      { after: "### The Data You Can Actually Use Tomorrow", text: " For more technical setup, see our [technical SEO checklist](/blog/technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better)." },
      { after: "Google Search Console is a free tool from Google that helps you monitor and troubleshoot your site", text: " ([Google Search Central](https://developers.google.com/search/docs/fundamentals/get-on-google))" },
    ]
  },
  {
    file: 'how-to-use-google-analytics-4-to-improve-your-content-strategy.mdx',
    inserts: [
      { after: "## Why Your Content Strategy Is Probably Guesswork", text: " If you haven't set up GA4 yet, start with our [Google Analytics beginners guide](/blog/google-analytics-for-beginners-how-to-track-your-website-traffic)." },
      { after: "### The Foundational Setup: Beyond Just the Code", text: " Cross-reference with [Search Console data](/blog/how-to-set-up-google-search-console-for-your-new-website) for a complete picture." },
      { after: "GA4 calculates engagement rate based on sessions that last longer than 10 seconds", text: " ([Google Analytics Help](https://support.google.com/analytics/answer/9973992))" },
    ]
  },
  {
    file: 'how-to-use-chatgpt-to-summarize-long-pdfs-for-free.mdx',
    inserts: [
      { after: "## How to Use ChatGPT to Summarize Long PDFs for Free", text: " For more ChatGPT workflows, see our [learn Excel faster with ChatGPT guide](/blog/how-to-learn-excel-faster-using-chatgpt)." },
      { after: "### The Step-by-Step Process", text: " If privacy is a concern, read our [ChatGPT safety guide](/blog/is-chatgpt-safe-2026-security-privacy-guide)." },
      { after: "ChatGPT Plus offers priority access to GPT-4 and additional features like Code Interpreter", text: " ([OpenAI Documentation](https://platform.openai.com/docs/guides/text-generation))" },
    ]
  },
  {
    file: 'chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows.mdx',
    inserts: [
      { after: "### What Exactly Is ChatGPT Memory?", text: " For a broader view of AI data privacy, see our [ChatGPT safety guide](/blog/is-chatgpt-safe-2026-security-privacy-guide)." },
      { after: "### How to View Your ChatGPT Memory: A Step-by-Step Guide", text: " Our [AI usage patterns article](/blog/chatgpt-usage-and-adoption-patterns-at-work-in-2026-what-the-data-shows) explores broader data collection trends." },
      { after: "OpenAI provides detailed documentation on how ChatGPT memory works and how data is used", text: " ([OpenAI Privacy Policy](https://openai.com/policies/privacy-policy/))" },
    ]
  },
  {
    file: 'how-to-remove-your-personal-information-from-google-search-results-2026-guide.mdx',
    inserts: [
      { after: "## Why Your Personal Information Shows Up on Google in the First Place", text: " For additional privacy protection, see our [best password managers guide](/blog/best-password-managers-in-2026-security-features-and-pricing-compared)." },
      { after: "### Step 5: Set Up Alerts and Stay Proactive", text: " Our guide on [ChatGPT memory tracking](/blog/chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows) covers similar data removal topics." },
      { after: "Google allows you to request the removal of personal information from search results", text: " ([Google Search Help](https://support.google.com/websearch/answer/9673730))" },
    ]
  },
  {
    file: 'how-to-fix-windows-11-update-errors-in-2026-step-by-step-troubleshooting-guide.mdx',
    inserts: [
      { after: "## How to Fix Windows 11 Update Errors in 2026: Step-by-Step Troubleshooting Guide", text: " For general PC performance tips, see our [Windows speed tweaks guide](/blog/speed-up-your-slow-pc-in-2026-10-essential-windows-performance-tweaks)." },
      { after: "### Before You Start: The Golden Rules of Troubleshooting", text: " Our [workflow automation guide](/blog/how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide) offers system maintenance strategies." },
      { after: "Windows Update errors can be caused by corrupted system files or incorrect configuration", text: " ([Microsoft Support](https://support.microsoft.com/en-us/windows/fix-windows-update-errors))" },
    ]
  },
  {
    file: 'android-phone-not-charging-10-fixes-for-2026-complete-troubleshooting-guide.mdx',
    inserts: [
      { after: "## Android Phone Not Charging? 10 Fixes for 2026", text: " If your battery drains quickly too, see our [Android battery drain guide](/blog/android-battery-draining-fast-after-update-7-proven-fixes-for-2026)." },
      { after: "### Fix 10: Consider a Battery Replacement", text: " For other device issues, see our [Windows 11 update errors guide](/blog/how-to-fix-windows-11-update-errors-in-2026-step-by-step-troubleshooting-guide)." },
      { after: "Lithium-ion batteries have a limited lifespan of 300 to 500 charge cycles", text: " ([Google Battery Care](https://support.google.com/pixelphone/answer/9601185))" },
    ]
  },
  {
    file: 'chatgpt-for-excel-how-to-use-new-financial-data-integrations-2024-guide.mdx',
    inserts: [
      { after: "## ChatGPT for Excel: How to Use New Financial Data Integrations", text: " For basic ChatGPT skills, see our [learn Excel faster with ChatGPT guide](/blog/how-to-learn-excel-faster-using-chatgpt)." },
      { after: "### The New Tools: From Generic AI to Financial Data Agents", text: " Our [workflow automation guide](/blog/how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide) covers additional productivity tools." },
      { after: "ChatGPT can integrate with Microsoft Excel through official add-ins and plugins", text: " ([Microsoft Excel API](https://learn.microsoft.com/en-us/office/dev/add-ins/))" },
    ]
  },
  {
    file: 'microsoft-free-ai-for-teachers-students-how-to-access-and-use-copilot-now.mdx',
    inserts: [
      { after: "## Microsoft's Free AI for Teachers and Students", text: " Our [AI in higher education guide](/blog/ai-in-higher-education-protecting-student-data-privacy-essential-tips-and-regula) covers data privacy implications." },
      { after: "### Why This Free Access Changes the Equation", text: " Read our [ChatGPT adoption analysis](/blog/chatgpt-usage-and-adoption-patterns-at-work-in-2026-what-the-data-shows) for workplace AI trends." },
      { after: "Microsoft Copilot for Education offers free AI access to students and teachers with eligible school accounts", text: " ([Microsoft Learn](https://learn.microsoft.com/en-us/training/modules/empower-educators-with-ai-and-copilot/))" },
    ]
  },
  {
    file: 'speed-up-your-slow-pc-in-2026-10-essential-windows-performance-tweaks.mdx',
    inserts: [
      { after: "## Speed Up Your Slow PC in 2026: 10 Essential Windows Performance Tweaks", text: " For specific error fixes, see our [Windows 11 update errors guide](/blog/how-to-fix-windows-11-update-errors-in-2026-step-by-step-troubleshooting-guide)." },
      { after: "### 1. Take Control of Your Startup", text: " Our [workflow automation guide](/blog/how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide) covers complementary organization strategies." },
      { after: "Windows 11 PCs typically see significant performance degradation after 18 months without maintenance", text: " ([Microsoft PC Manager](https://learn.microsoft.com/en-us/windows/pc-manager/))" },
    ]
  },
  {
    file: 'how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide.mdx',
    inserts: [
      { after: "## Your 2026 Guide to Automating Your Workflow with Free Tools", text: " For AI-specific automation, see our [ChatGPT for Excel guide](/blog/chatgpt-for-excel-how-to-use-new-financial-data-integrations-2024-guide)." },
      { after: "### Why Your Brain Is Better Than a Bot", text: " Keep your machine running smoothly with our [PC performance tweaks guide](/blog/speed-up-your-slow-pc-in-2026-10-essential-windows-performance-tweaks)." },
      { after: "Knowledge workers spend a significant portion of their day on work about work rather than strategic tasks", text: " ([Zapier Guides](https://zapier.com/guides))" },
    ]
  },
  {
    file: 'android-battery-draining-fast-after-update-7-proven-fixes-for-2026.mdx',
    inserts: [
      { after: "## Android Battery Draining Fast After Update? 7 Proven Fixes for 2026", text: " For charging issues, see our [Android phone not charging guide](/blog/android-phone-not-charging-10-fixes-for-2026-complete-troubleshooting-guide)." },
      { after: "### First: Give It a Day of Grace", text: " Our [PC speed tweaks guide](/blog/speed-up-your-slow-pc-in-2026-10-essential-windows-performance-tweaks) covers battery optimization for laptops too." },
      { after: "Android updates often trigger background optimization processes that temporarily increase battery drain", text: " ([Google Battery Health](https://support.google.com/pixelphone/answer/9601185))" },
    ]
  },
  {
    file: 'chrome-removes-ai-privacy-wording-what-googles-on-device-data-claim-means-for-us.mdx',
    inserts: [
      { after: "## Chrome Removes AI Privacy Wording, Google Says Data Still Stays On-Device", text: " For more on AI data collection, read our [ChatGPT tracking analysis](/blog/chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows)." },
      { after: "### The Specific Change: What Words Were Removed?", text: " Our [personal info removal guide](/blog/how-to-remove-your-personal-information-from-google-search-results-2026-guide) covers additional privacy steps." },
      { after: "Google's Chrome Privacy Whitepaper details how the browser handles user data and on-device processing", text: " ([Chrome Privacy Whitepaper](https://www.google.com/chrome/privacy/))" },
    ]
  },
  {
    file: 'chatgpt-usage-and-adoption-patterns-at-work-in-2026-what-the-data-shows.mdx',
    inserts: [
      { after: "## ChatGPT Usage and Adoption Patterns at Work in 2026", text: " For industry predictions, see our [AI office automation article](/blog/ai-to-automate-office-work-in-1218-months-microsofts-ceo-predictions-and-practic)." },
      { after: "### The Big Picture: Who Is Using AI at Work?", text: " Our [Microsoft Copilot for education guide](/blog/microsoft-free-ai-for-teachers-students-how-to-access-and-use-copilot-now) explores similar adoption trends." },
      { after: "OpenAI publishes regular research on how ChatGPT is being used across different industries", text: " ([OpenAI Research](https://openai.com/research/))" },
    ]
  },
  {
    file: 'best-password-managers-in-2026-security-features-and-pricing-compared.mdx',
    inserts: [
      { after: "## Best Password Managers in 2026: Security, Features, and Pricing Compared", text: " For another essential privacy tool, see our [free VPN comparison guide](/blog/best-free-vpn-services-in-2026-complete-comparison-and-privacy-guide)." },
      { after: "### Why You Can't Skip a Password Manager in 2026", text: " Our [personal info removal guide](/blog/how-to-remove-your-personal-information-from-google-search-results-2026-guide) covers what to do if data is exposed." },
      { after: "The global average cost of a data breach reached millions in 2024, highlighting the importance of strong passwords", text: " ([NIST Password Guidelines](https://pages.nist.gov/800-63-3/))" },
    ]
  },
  {
    file: 'ai-to-automate-office-work-in-1218-months-microsofts-ceo-predictions-and-practic.mdx',
    inserts: [
      { after: "## My First Reaction to Microsoft's AI Timeline", text: " For data on current trends, see our [ChatGPT adoption analysis](/blog/chatgpt-usage-and-adoption-patterns-at-work-in-2026-what-the-data-shows)." },
      { after: "### What Microsoft's CEO Actually Predicted", text: " For hands-on tools, read our [workflow automation guide](/blog/how-to-automate-your-daily-workflow-with-free-tools-in-2026-complete-guide)." },
      { after: "Microsoft predicts that AI agents will handle the majority of routine office tasks within the next two years", text: " ([Microsoft AI](https://www.microsoft.com/en-us/ai))" },
    ]
  },
  {
    file: 'best-free-vpn-services-in-2026-complete-comparison-and-privacy-guide.mdx',
    inserts: [
      { after: "## Best Free VPN Services in 2026: Complete Comparison and Privacy Guide", text: " Secure your accounts with our [best password managers guide](/blog/best-password-managers-in-2026-security-features-and-pricing-compared)." },
      { after: "### What to Look For in a Free VPN in 2026", text: " For broader online privacy, see our [personal info removal guide](/blog/how-to-remove-your-personal-information-from-google-search-results-2026-guide)." },
      { after: "The Electronic Frontier Foundation provides a comprehensive guide to choosing a trustworthy VPN provider", text: " ([EFF VPN Guide](https://www.eff.org/pages/choosing-vpn))" },
    ]
  },
  {
    file: 'why-ai-usage-is-dropping-math-skills-in-berkeley-cs-classes-and-what-students-ca.mdx',
    inserts: [
      { after: "## Why AI Usage Is Dropping Math Skills in Berkeley CS Classes", text: " Our [AI in higher education guide](/blog/ai-in-higher-education-protecting-student-data-privacy-essential-tips-and-regula) covers related data privacy concerns." },
      { after: "### The Specific Problem at Berkeley: It's Not Cheating, It's Skill Erosion", text: " Read our [ChatGPT adoption analysis](/blog/chatgpt-usage-and-adoption-patterns-at-work-in-2026-what-the-data-shows) for broader AI dependency trends." },
      { after: "Studies from leading universities show a correlation between AI tool usage and declining performance on closed-book exams", text: " ([Berkeley EECS](https://eecs.berkeley.edu/resources/students))" },
    ]
  },
  {
    file: 'ai-in-higher-education-protecting-student-data-privacy-essential-tips-and-regula.mdx',
    inserts: [
      { after: "## When Your University's AI Knows Too Much", text: " For related risks, see our [ChatGPT safety guide](/blog/is-chatgpt-safe-2026-security-privacy-guide)." },
      { after: "### The Regulatory Maze: More Than Just FERPA", text: " Our [AI math skills article](/blog/why-ai-usage-is-dropping-math-skills-in-berkeley-cs-classes-and-what-students-ca) explores AI's academic impact further." },
      { after: "EDUCAUSE conducts annual surveys on AI adoption trends in higher education institutions", text: " ([EDUCAUSE AI](https://www.educause.edu/topics/artificial-intelligence))" },
    ]
  },
  {
    file: 'is-chatgpt-safe-2026-security-privacy-guide.mdx',
    inserts: [
      { after: "## Is ChatGPT Safe? A Deep Dive into 2026 Security and Privacy", text: " Our [ChatGPT tracking guide](/blog/chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows) shows what data ChatGPT stores about you." },
      { after: "### The Real Security Risks: What Are We Actually Worried About?", text: " See our [best password managers guide](/blog/best-password-managers-in-2026-security-features-and-pricing-compared) for account security best practices." },
      { after: "OpenAI publishes a transparency report detailing security incidents and privacy safeguards", text: " ([OpenAI Trust](https://openai.com/trust/))" },
    ]
  },
  {
    file: 'how-to-learn-excel-faster-using-chatgpt.mdx',
    inserts: [
      { after: "## How to Learn Excel Faster Using ChatGPT", text: " Our [ChatGPT for Excel financial guide](/blog/chatgpt-for-excel-how-to-use-new-financial-data-integrations-2024-guide) covers advanced data analysis use cases." },
      { after: "### Why ChatGPT is Your Secret Weapon for Excel", text: " For free AI learning tools, see our [Microsoft Copilot for education guide](/blog/microsoft-free-ai-for-teachers-students-how-to-access-and-use-copilot-now)." },
      { after: "Microsoft Excel supports over 500 built-in functions for data analysis and calculation", text: " ([Microsoft Excel Help](https://support.microsoft.com/en-us/excel))" },
    ]
  },
];

// Apply all insertions
let totalOk = 0;
let totalFail = 0;

for (const s of spec) {
  const filepath = path.join(dir, s.file);
  if (!fs.existsSync(filepath)) {
    console.log(`FILE NOT FOUND: ${s.file}`);
    totalFail += s.inserts.length;
    continue;
  }

  let content = fs.readFileSync(filepath, 'utf8');
  let modified = false;

  for (const { after, text } of s.inserts) {
    const result = insertAfter(content, after, text);
    if (result === null) {
      // Try to find the text in a fuzzy way - search for key substring
      const cleanAfter = after.replace(/^##+\s*/, '').replace(/^###\s*/, '');
      console.log(`  FAIL: "${cleanAfter.substring(0, 50)}..." NOT found in ${s.file}`);
      totalFail++;
    } else {
      content = result;
      modified = true;
      totalOk++;
    }
  }

  if (modified) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`  DONE: ${s.file}`);
  }
}

console.log(`\nResult: ${totalOk} insertions OK, ${totalFail} failures`);
