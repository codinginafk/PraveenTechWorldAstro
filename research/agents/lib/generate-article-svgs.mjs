import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../../");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const GENERATED_DIR = path.join(ROOT_DIR, "public/images/generated");

if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

// Map slug to title, category/badge, emoji, and subtext
const svgConfigs = {
  "is-chatgpt-safe-2026-security-privacy-guide": {
    title: "AI Token Dashboard",
    category: "AI AUTOMATION",
    emoji: "📊",
    subtext: "Save 60% on your API bills",
    gradient: "from-[#8b5cf6] to-[#ec4899]",
    desc: "Cut My API Bill by 60%"
  },
  "what-is-domain-authority-and-how-to-improve-it-in-2026": {
    title: "Domain Authority Boost",
    category: "WEBSITE SETUP",
    emoji: "📈",
    subtext: "How I went from 0 to 20+",
    gradient: "from-[#3b82f6] to-[#10b981]",
    desc: "SEO Optimization Guide"
  },
  "how-to-set-up-google-search-console-for-your-new-website": {
    title: "Search Console Setup",
    category: "WEBSITE SETUP",
    emoji: "🔍",
    subtext: "Complete Google integration guide",
    gradient: "from-[#f59e0b] to-[#ef4444]",
    desc: "Verification and indexing checklist"
  },
  "website-speed-optimization-why-it-matters-for-seo-and-how-to-fix-it": {
    title: "14KB Vanilla Web",
    category: "WEBSITE SETUP",
    emoji: "⚡",
    subtext: "Replacing 2MB bloat with raw HTML",
    gradient: "from-[#10b981] to-[#6366f1]",
    desc: "Core Web Vitals Optimization"
  },
  "how-to-use-google-analytics-4-to-improve-your-content-strategy": {
    title: "GA4 Content Strategy",
    category: "WEBSITE SETUP",
    emoji: "📊",
    subtext: "Turn numbers into ranking articles",
    gradient: "from-[#6366f1] to-[#3b82f6]",
    desc: "Google Analytics 4 Guide"
  },
  "backlink-building-guide-for-new-websites-get-your-first-quality-links": {
    title: "Quality Backlink Guide",
    category: "WEBSITE SETUP",
    emoji: "🔗",
    subtext: "Get your first 10 high-value backlinks",
    gradient: "from-[#3b82f6] to-[#8b5cf6]",
    desc: "SEO Growth Strategy"
  },
  "how-to-write-seo-friendly-blog-posts-that-actually-rank-on-google": {
    title: "SEO Friendly Blog Writing",
    category: "WEBSITE SETUP",
    emoji: "📝",
    subtext: "Write articles that search engines love",
    gradient: "from-[#8b5cf6] to-[#10b981]",
    desc: "Content Writing Optimization"
  },
  "technical-seo-checklist-for-beginners-fix-these-issues-to-rank-better": {
    title: "Technical SEO Checklist",
    category: "WEBSITE SETUP",
    emoji: "🛠️",
    subtext: "15 issues beginners miss & how to fix them",
    gradient: "from-[#ef4444] to-[#f59e0b]",
    desc: "Protect your search rankings"
  },
  "how-to-learn-excel-faster-using-chatgpt": {
    title: "Excel + ChatGPT",
    category: "PRODUCTIVITY",
    emoji: "📊",
    subtext: "Learn formulas and macros in seconds",
    gradient: "from-[#10b981] to-[#3b82f6]",
    desc: "Smart spreadsheet automation"
  },
  "speed-up-your-slow-pc-in-2026-10-essential-windows-performance-tweaks": {
    title: "Speed Up Slow PC",
    category: "WINDOWS FIXES",
    emoji: "⚡",
    subtext: "10 essential tweaks for Windows 11",
    gradient: "from-[#ef4444] to-[#6366f1]",
    desc: "Performance tuning guide"
  },
  "microsoft-free-ai-for-teachers-students-how-to-access-and-use-copilot-now": {
    title: "Free Copilot for Education",
    category: "AI WEBSITES",
    emoji: "🎓",
    subtext: "Access free AI for teachers and students",
    gradient: "from-[#3b82f6] to-[#ec4899]",
    desc: "Microsoft AI integration"
  },
  "chatgpt-for-excel-how-to-use-new-financial-data-integrations-2024-guide": {
    title: "ChatGPT for Excel",
    category: "PRODUCTIVITY",
    emoji: "📈",
    subtext: "Automate financial data in seconds",
    gradient: "from-[#10b981] to-[#f59e0b]",
    desc: "Automated analysis pipeline"
  },
  "chatgpt-has-been-tracking-everything-you-say-heres-how-to-see-what-it-knows": {
    title: "ChatGPT Privacy Alert",
    category: "PRIVACY",
    emoji: "🔒",
    subtext: "How to see what AI tracks about you",
    gradient: "from-[#f59e0b] to-[#ef4444]",
    desc: "Data privacy & security guide"
  },
  "fix-windows-11-update-errors-2026-troubleshooting": {
    title: "Windows 11 Update Fix",
    category: "WINDOWS FIXES",
    emoji: "🛠️",
    subtext: "Step-by-step update error fixes",
    gradient: "from-[#ef4444] to-[#3b82f6]",
    desc: "Troubleshoot update stuck loop"
  },
  "android-phone-not-charging-10-fixes-for-2026-complete-troubleshooting-guide": {
    title: "Android Charging Fix",
    category: "WINDOWS FIXES",
    emoji: "🔌",
    subtext: "10 fixes for phone not charging",
    gradient: "from-[#f59e0b] to-[#10b981]",
    desc: "Hardware & software fixes"
  },
  "android-battery-draining-fast-after-update-7-proven-fixes-for-2026": {
    title: "Fix Android Battery Drain",
    category: "WINDOWS FIXES",
    emoji: "🔋",
    subtext: "7 proven fixes after system updates",
    gradient: "from-[#10b981] to-[#ef4444]",
    desc: "Battery calibration & stats"
  },
  "ai-usage-dropping-math-skills-berkeley-cs-classes": {
    title: "Autonomous AI Agents",
    category: "AI AUTOMATION",
    emoji: "🤖",
    subtext: "Berkeley students break the chatbox",
    gradient: "from-[#6366f1] to-[#ec4899]",
    desc: "The rise of agentic sandboxes"
  },
  "ai-in-higher-education-protecting-student-data-privacy-tips": {
    title: "AI Student Privacy",
    category: "PRIVACY",
    emoji: "🔒",
    subtext: "Protecting student data in higher ed",
    gradient: "from-[#3b82f6] to-[#8b5cf6]",
    desc: "Data protection & compliance"
  },
  "how-to-use-chatgpt-to-summarize-long-pdfs-for-free": {
    title: "PDF Summarizer AI",
    category: "PRODUCTIVITY",
    emoji: "📄",
    subtext: "Summarize 100-page PDFs for free",
    gradient: "from-[#8b5cf6] to-[#f59e0b]",
    desc: "Save hours of reading"
  },
  "chrome-removes-ai-privacy-wording-google-on-device-data": {
    title: "Chrome AI Privacy",
    category: "PRIVACY",
    emoji: "🌐",
    subtext: "What Google removing privacy wording means",
    gradient: "from-[#3b82f6] to-[#ef4444]",
    desc: "On-device processing details"
  },
  "chatgpt-usage-and-adoption-patterns-at-work-in-2026-what-the-data-shows": {
    title: "AI Adoption at Work",
    category: "AI WEBSITES",
    emoji: "🤖",
    subtext: "Workplace data & adoption statistics",
    gradient: "from-[#6366f1] to-[#10b981]",
    desc: "How tools are used in 2026"
  },
  "how-to-use-ai-to-write-emails-that-get-replies-2026-guide": {
    title: "Write Emails with AI",
    category: "PRODUCTIVITY",
    emoji: "✉️",
    subtext: "Draft messages that get read & replied to",
    gradient: "from-[#8b5cf6] to-[#3b82f6]",
    desc: "High-conversion copywriting"
  },
  "how-to-remove-your-personal-information-from-google-search-results-2026-guide": {
    title: "Remove Personal Info",
    category: "PRIVACY",
    emoji: "🛡️",
    subtext: "Remove yourself from Google search results",
    gradient: "from-[#ef4444] to-[#8b5cf6]",
    desc: "Privacy protection guide"
  },
  "windows-11-kb5089573-update-errors-slow-internet-fix": {
    title: "Fix KB5089573 Internet",
    category: "WINDOWS FIXES",
    emoji: "📶",
    subtext: "Critical fix for broken internet update",
    gradient: "from-[#ef4444] to-[#f59e0b]",
    desc: "3-step router & connection fix"
  },
  "ai-powered-expense-report-automation-for-office-workers-no-code-solutions": {
    title: "AI Expense Reports",
    category: "AI AUTOMATION",
    emoji: "💵",
    subtext: "No-code receipt extraction & automation",
    gradient: "from-[#10b981] to-[#6366f1]",
    desc: "DeepSeek automated accounting"
  }
};

// Colors for raw SVG gradient generation
const colorMap = {
  "from-[#8b5cf6] to-[#ec4899]": { c1: "#8b5cf6", c2: "#ec4899", bg: "#fbf8ff" },
  "from-[#3b82f6] to-[#10b981]": { c1: "#3b82f6", c2: "#10b981", bg: "#f0fcf7" },
  "from-[#f59e0b] to-[#ef4444]": { c1: "#f59e0b", c2: "#ef4444", bg: "#fff7f5" },
  "from-[#10b981] to-[#6366f1]": { c1: "#10b981", c2: "#6366f1", bg: "#f4fcf9" },
  "from-[#6366f1] to-[#3b82f6]": { c1: "#6366f1", c2: "#3b82f6", bg: "#f5f7ff" },
  "from-[#3b82f6] to-[#8b5cf6]": { c1: "#3b82f6", c2: "#8b5cf6", bg: "#f5f8ff" },
  "from-[#8b5cf6] to-[#10b981]": { c1: "#8b5cf6", c2: "#10b981", bg: "#f7fbf8" },
  "from-[#ef4444] to-[#f59e0b]": { c1: "#ef4444", c2: "#f59e0b", bg: "#fffaf5" },
  "from-[#10b981] to-[#3b82f6]": { c1: "#10b981", c2: "#3b82f6", bg: "#f0fbf7" },
  "from-[#ef4444] to-[#6366f1]": { c1: "#ef4444", c2: "#6366f1", bg: "#fff5f6" },
  "from-[#3b82f6] to-[#ec4899]": { c1: "#3b82f6", c2: "#ec4899", bg: "#fbf5ff" },
  "from-[#10b981] to-[#f59e0b]": { c1: "#10b981", c2: "#f59e0b", bg: "#fbfcf6" },
  "from-[#ef4444] to-[#3b82f6]": { c1: "#ef4444", c2: "#3b82f6", bg: "#fff5f6" },
  "from-[#6366f1] to-[#ec4899]": { c1: "#6366f1", c2: "#ec4899", bg: "#fbf5ff" },
  "from-[#6366f1] to-[#10b981]": { c1: "#6366f1", c2: "#10b981", bg: "#f5fcf8" },
  "from-[#8b5cf6] to-[#3b82f6]": { c1: "#8b5cf6", c2: "#3b82f6", bg: "#f5f7ff" },
  "from-[#ef4444] to-[#8b5cf6]": { c1: "#ef4444", c2: "#8b5cf6", bg: "#fff5f9" }
};

function generateSvgContent(config) {
  const colors = colorMap[config.gradient] || { c1: "#6366f1", c2: "#a855f7", bg: "#f8fafc" };
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="800" height="400">
  <!-- Dynamic Gradient Background -->
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.bg}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.c1}"/>
      <stop offset="100%" stop-color="${colors.c2}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="${colors.c1}" flood-opacity="0.15"/>
    </filter>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${colors.c1}" stroke-width="0.5" opacity="0.06"/>
    </pattern>
  </defs>

  <rect width="800" height="400" fill="url(#bgGrad)"/>
  <rect width="800" height="400" fill="url(#grid)"/>

  <!-- Core Illustration Card -->
  <g filter="url(#shadow)">
    <rect x="80" y="60" width="640" height="280" rx="24" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  </g>

  <!-- Left Side: Large Emoji Badge -->
  <rect x="120" y="100" width="120" height="120" rx="24" fill="url(#badgeGrad)" opacity="0.9"/>
  <text x="180" y="174" text-anchor="middle" font-family="'Segoe UI Emoji', Arial" font-size="54" fill="#ffffff">${config.emoji}</text>

  <!-- Right Side: Content Details -->
  <rect x="270" y="100" width="130" height="26" rx="13" fill="${colors.c1}" fill-opacity="0.1"/>
  <text x="335" y="117" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="10" fill="${colors.c1}" letter-spacing="1.5">${config.category}</text>
  
  <text x="270" y="170" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="34" fill="#0f172a">${config.title}</text>
  <text x="270" y="215" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="18" fill="#64748b">${config.subtext}</text>

  <line x1="270" y1="250" x2="680" y2="250" stroke="#e2e8f0" stroke-width="1"/>

  <!-- Footer description details -->
  <text x="270" y="285" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="14" fill="#0f172a">${config.desc}</text>
  <text x="270" y="305" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="12" fill="#94a3b8">PraveenTechWorld Practical Guide Series</text>
</svg>`;
}

async function run() {
  console.log("=== Generating cover SVGs & updating Frontmatter ===");
  let updatedCount = 0;

  for (const [slug, config] of Object.entries(svgConfigs)) {
    const svgPath = path.join(GENERATED_DIR, `${slug}.svg`);
    const svgContent = generateSvgContent(config);
    
    // Write SVG file
    fs.writeFileSync(svgPath, svgContent, "utf-8");
    console.log(`Generated SVG: ${slug}.svg`);

    // Update MDX frontmatter
    const mdxPath = path.join(ARTICLES_DIR, `${slug}.mdx`);
    if (fs.existsSync(mdxPath)) {
      try {
        let content = fs.readFileSync(mdxPath, "utf-8");
        
        // Find coverImage line and replace it
        if (content.includes("coverImage:")) {
          content = content.replace(/^coverImage:\s*".+?"/m, `coverImage: "/images/generated/${slug}.svg"`);
          content = content.replace(/^coverImage:\s*https?:\/\/.+/m, `coverImage: "/images/generated/${slug}.svg"`);
        } else {
          // Insert coverImage in frontmatter if not present
          content = content.replace(/^---/m, `---\ncoverImage: "/images/generated/${slug}.svg"`);
        }
        
        fs.writeFileSync(mdxPath, content, "utf-8");
        console.log(`Updated frontmatter coverImage for: ${slug}.mdx`);
        updatedCount++;
      } catch (err) {
        console.error(`Failed to update frontmatter for ${slug}.mdx: ${err.message}`);
      }
    }
  }

  console.log(`Done! Generated/Updated ${updatedCount} articles.`);
}

run();
