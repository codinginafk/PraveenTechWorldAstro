import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { callLLM } from "./lib/shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(__filename, "../../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");
const REPORT_DIR = path.join(ROOT_DIR, "research/reports/batch-logs");

// ---------- topics ----------
const TOPICS = [
  // --- AI Tools (1-8) ---
  { title: "How to Use ChatGPT to Summarize Long PDFs for Free", cat: "ai-tools", tags: ["chatgpt", "productivity-tips"],
    seo: "Summarize PDFs with ChatGPT for Free",
    hook: "Stop reading 50-page PDFs. Drop them into ChatGPT and get the summary in 10 seconds." },
  { title: "Write Better Emails with Claude — Prompt Templates for Work", cat: "ai-tools", tags: ["claude", "productivity-tips"],
    seo: "Write Professional Emails with Claude AI Templates",
    hook: "I used to spend 20 minutes on one email. Claude cuts that to 2." },
  { title: "Gemini vs ChatGPT vs Claude: Best AI for Students on a Budget", cat: "ai-tools", tags: ["chatgpt", "claude", "gemini"],
    seo: "Gemini vs ChatGPT vs Claude: Best Free AI for Students",
    hook: "All three are free. But only one is right for what you need." },
  { title: "How to Use Perplexity for Research Instead of Google", cat: "ai-tools", tags: ["perplexity", "productivity-tips"],
    seo: "Replace Google with Perplexity AI for Better Research",
    hook: "Google gives you links. Perplexity gives you answers with sources." },
  { title: "ChatGPT Voice Mode for Practicing Job Interviews", cat: "ai-tools", tags: ["chatgpt", "career"],
    seo: "Practice Job Interviews with ChatGPT Advanced Voice Mode",
    hook: "I practiced 12 mock interviews with ChatGPT before my real one. Got the offer." },
  { title: "Generate Excel Formulas with AI — No Memorization Needed", cat: "ai-tools", tags: ["chatgpt", "excel"],
    seo: "Generate Excel Formulas Using AI: Stop Memorizing",
    hook: "Describe what you need in plain English. AI writes the formula." },
  { title: "Turn Meeting Transcripts into Action Items with ChatGPT", cat: "ai-tools", tags: ["chatgpt", "productivity-tips"],
    seo: "Turn Meeting Transcripts into Action Items Using ChatGPT",
    hook: "One hour-long meeting used to mean 30 minutes of notes. Not anymore." },
  { title: "Best Free AI Image Generators for Social Media Posts", cat: "ai-tools", tags: ["chatgpt", "productivity-tips"],
    seo: "Best Free AI Image Generators for Social Media Content",
    hook: "You don't need Canva Pro when these free AI tools exist." },

  // --- Productivity (9-14) ---
  { title: "The 5-4-3-2-1 Method for Morning Focus", cat: "productivity", tags: ["productivity-tips"],
    seo: "5-4-3-2-1 Morning Focus Method: Simple Productivity Hack",
    hook: "My most productive mornings started with a countdown. Not a coffee." },
  { title: "How to Batch Your Email and Slack for Deep Work", cat: "productivity", tags: ["productivity-tips"],
    seo: "Batch Email and Slack: Deep Work Productivity Guide",
    hook: "Checking messages every 10 minutes is killing your focus. Here's the fix." },
  { title: "The Two-Minute Rule Explained with Real Office Examples", cat: "productivity", tags: ["productivity-tips"],
    seo: "Two-Minute Rule: Real Office Examples for Productivity",
    hook: "If it takes less than two minutes, do it now. Sounds simple — it changes everything." },
  { title: "Time Blocking on Google Calendar Step by Step", cat: "productivity", tags: ["productivity-tips"],
    seo: "Time Blocking on Google Calendar: Step-by-Step Guide",
    hook: "I used to plan my day in my head. Now I block every hour. Here's exactly how." },
  { title: "How to Say No to Meetings Without Sounding Difficult", cat: "productivity", tags: ["productivity-tips", "career"],
    seo: "How to Decline Meetings Professionally (Scripts Included)",
    hook: "You don't need to be in that meeting. Here's what to say instead." },
  { title: "Build a Personal Dashboard in Google Sheets for Habit Tracking", cat: "productivity", tags: ["productivity-tips", "excel"],
    seo: "Build a Free Habit Tracker Dashboard in Google Sheets",
    hook: "I built this in 20 minutes and it completely changed how I track habits." },

  // --- Windows Fixes (15-20) ---
  { title: "Windows 11 Slow? 7 Settings to Turn Off Right Now", cat: "windows-fixes", tags: ["windows"],
    seo: "Windows 11 Running Slow? Turn Off These 7 Settings",
    hook: "New laptop running slow? It's not the hardware. It's these settings." },
  { title: "How to Free Up 20GB Without Any Software", cat: "windows-fixes", tags: ["windows"],
    seo: "Free Up 20GB on Windows Without Installing Anything",
    hook: "You don't need CCleaner. Windows has tools built in that can clear 20GB." },
  { title: "Blue Screen Errors — What They Mean and When to Worry", cat: "windows-fixes", tags: ["windows"],
    seo: "Blue Screen of Death: What Each Error Code Really Means",
    hook: "Got a blue screen? Don't panic. Most of them are easy to fix." },
  { title: "How to Speed Up Windows Startup by Disabling Bloatware", cat: "windows-fixes", tags: ["windows"],
    seo: "Speed Up Windows Startup by Removing Bloatware",
    hook: "Your PC takes 5 minutes to boot because of stuff you never asked for." },
  { title: "Windows Search Not Working? Fix in 3 Steps", cat: "windows-fixes", tags: ["windows"],
    seo: "Windows Search Not Working? Fix It in 3 Steps",
    hook: "When Windows search stops working, everything slows down. Here's the quick fix." },
  { title: "How to Set Up Automatic Backups on Windows Free", cat: "windows-fixes", tags: ["windows"],
    seo: "Set Up Automatic Windows Backups Without Paid Software",
    hook: "You're one hard drive failure away from losing everything. Fix that now." },

  // --- Android Fixes (21-26) ---
  { title: "Android Battery Draining Fast? 5 Hidden Settings to Fix It", cat: "android-fixes", tags: ["android"],
    seo: "Android Battery Draining? 5 Hidden Settings to Save Power",
    hook: "Your battery shouldn't die by 2 PM. These settings are the real culprits." },
  { title: "How to Debloat Your Android Phone Without Root", cat: "android-fixes", tags: ["android"],
    seo: "Remove Bloatware from Android Without Root Access",
    hook: "That game you never installed is still running in the background." },
  { title: "Stop Spam Calls on Android for Free", cat: "android-fixes", tags: ["android"],
    seo: "Block Spam Calls on Android Completely for Free",
    hook: "I went from 10 spam calls a day to zero. Here's how." },
  { title: "Android Storage Full? Find the Real Culprits", cat: "android-fixes", tags: ["android"],
    seo: "Android Storage Full? Find and Delete the Hidden Culprits",
    hook: "Your phone says storage is full but you can't find what's taking space. Try this." },
  { title: "How to Extend Your Phone's Life by 2 Years", cat: "android-fixes", tags: ["android"],
    seo: "Make Your Android Phone Last 2 Years Longer",
    hook: "You don't need a new phone. You need to start doing these 5 things." },
  { title: "Best Free Android Apps for Students", cat: "android-fixes", tags: ["android", "productivity-tips"],
    seo: "Best Free Android Apps Every Student Should Have",
    hook: "These 8 apps replaced my expensive study tools and they're all free." },

  // --- Career Growth (27-32) ---
  { title: "How to Write a One-Page Resume That Recruiters Actually Read", cat: "career-growth", tags: ["career"],
    seo: "Write a One-Page Resume That Actually Gets Read",
    hook: "Recruiters spend 7 seconds on a resume. Here's how to make those seconds count." },
  { title: "The STAR Method Cheat Sheet with Copy-Paste Templates", cat: "career-growth", tags: ["career"],
    seo: "STAR Method Cheat Sheet: Interview Templates You Can Copy",
    hook: "Most people bomb behavioral questions. These templates make them easy." },
  { title: "How to Ask for a Raise — Email Template Included", cat: "career-growth", tags: ["career"],
    seo: "How to Ask for a Raise: Email Template and Script",
    hook: "I got a 15% raise using exactly this template. Here it is." },
  { title: "LinkedIn Profile Checklist for Fresh Graduates", cat: "career-growth", tags: ["career"],
    seo: "LinkedIn Profile Checklist for College Graduates",
    hook: "Your LinkedIn profile is your new resume. Here's exactly how to fix it." },
  { title: "How to Answer Tell Me About Yourself in 60 Seconds", cat: "career-growth", tags: ["career"],
    seo: "How to Answer Tell Me About Yourself in 60 Seconds",
    hook: "The most common interview question and most people get it wrong." },
  { title: "Build a Free Portfolio Website with GitHub Pages", cat: "career-growth", tags: ["career"],
    seo: "Build a Free Portfolio Website Using GitHub Pages",
    hook: "A portfolio site costs zero dollars. Here's how to build one in 30 minutes." },

  // --- AI Workflows (33-37) ---
  { title: "Automate Your Email Triage with GPT and Gmail Filters", cat: "ai-workflows", tags: ["chatgpt", "automation"],
    seo: "Automate Email Triage Using GPT and Gmail Filters",
    hook: "500 unread emails become 15 real ones after this setup." },
  { title: "How to Use AI to Brainstorm Blog Posts in 10 Minutes", cat: "ai-workflows", tags: ["chatgpt", "productivity-tips"],
    seo: "Brainstorm Blog Post Ideas with AI in 10 Minutes",
    hook: "Writer's block is over. Here's how I use AI to generate 20 topics in 10 min." },
  { title: "Prompt Engineering Basics: 3 Patterns That Work Every Time", cat: "ai-workflows", tags: ["chatgpt", "productivity-tips"],
    seo: "Prompt Engineering: 3 Simple Patterns That Always Work",
    hook: "You don't need a course. These 3 prompt patterns handle 90% of what I need." },
  { title: "Turn a YouTube Video into Notes with Free AI Tools", cat: "ai-workflows", tags: ["chatgpt", "productivity-tips"],
    seo: "Convert YouTube Videos to Notes Using Free AI",
    hook: "I turned a 2-hour lecture into 3 pages of notes in under 5 minutes." },
  { title: "AI for Non-Technical People: No-Code Automation with ChatGPT", cat: "ai-workflows", tags: ["chatgpt", "automation"],
    seo: "No-Code AI Automation for Non-Technical People",
    hook: "You don't need to know Python to automate your work. ChatGPT does it." },

  // --- Automation (38-41) ---
  { title: "Automate Repetitive Excel Tasks with Python Pandas", cat: "automation", tags: ["automation", "excel"],
    seo: "Automate Excel Tasks with Pandas (No Coding Experience Needed)",
    hook: "If you do the same Excel task every week, this will save you hours." },
  { title: "IFTTT vs Make.com vs Zapier: Best Free Plan Compared", cat: "automation", tags: ["automation"],
    seo: "IFTTT vs Make.com vs Zapier: Which Free Plan Is Best",
    hook: "All three are free. But only one is right for what you need to automate." },
  { title: "Auto-Save Email Attachments to Google Drive for Free", cat: "automation", tags: ["automation"],
    seo: "Auto-Save Email Attachments to Google Drive Automatically",
    hook: "Never manually download another email attachment. Set this up once." },
  { title: "Schedule Social Media Posts for Free with Buffer", cat: "automation", tags: ["automation"],
    seo: "Schedule Social Media Posts for Free Using Buffer",
    hook: "I batch-write a week of posts in one hour. Buffer posts them for me." },

  // --- Security (42-46) ---
  { title: "How to Set Up 2FA on All Accounts in 15 Minutes", cat: "security", tags: ["security"],
    seo: "Set Up Two-Factor Authentication on Every Account in 15 Min",
    hook: "One stolen password is all it takes. 15 minutes fixes that forever." },
  { title: "Best Free Password Managers Compared", cat: "security", tags: ["security", "bitwarden"],
    seo: "Best Free Password Managers: Bitwarden vs Apple Keychain",
    hook: "Stop using the same password for everything. These tools make it painless." },
  { title: "Phishing Emails: 5 Red Flags Everyone Should Know", cat: "security", tags: ["security"],
    seo: "5 Phishing Email Red Flags Everyone Should Recognize",
    hook: "That urgent email from your boss? Look closer. Here's what gives it away." },
  { title: "Free VPNs That Aren't Scams — What Actually Works", cat: "security", tags: ["security"],
    seo: "Free VPNs That Are Actually Safe to Use in 2026",
    hook: "Most free VPNs sell your data. These three are the real exceptions." },
  { title: "How to Check If Your Password Was Leaked", cat: "security", tags: ["security"],
    seo: "Check If Your Password Was Leaked with Have I Been Pwned",
    hook: "Your password is probably on a list right now. Here's how to check for free." },

  // --- Privacy (47-50) ---
  { title: "Stop Google From Tracking You — 8 Settings to Change", cat: "privacy", tags: ["privacy"],
    seo: "Stop Google Tracking: 8 Privacy Settings to Change Now",
    hook: "Google knows where you were yesterday. These settings stop that." },
  { title: "How to Use a Burner Email for Signups", cat: "privacy", tags: ["privacy"],
    seo: "Use Temporary Email Addresses to Protect Your Privacy",
    hook: "Every signup sells your email. Use a burner instead." },
  { title: "Facebook Privacy Checkup: What to Turn Off Right Now", cat: "privacy", tags: ["privacy"],
    seo: "Facebook Privacy Settings: What to Turn Off Immediately",
    hook: "Facebook knows more about you than your family. Here's how to lock it down." },
  { title: "How to Opt Out of Data Brokers for Free", cat: "privacy", tags: ["privacy"],
    seo: "Opt Out of Data Brokers Without Paying a Dime",
    hook: "Data brokers sell your info to anyone. Here's how to remove yourself for free." },
];

// ---------- anti-detection rules ----------
const ANTI_AI_RULES = [
  "Write like a real person, not an assistant. Use a conversational, natural tone.",
  "Use contractions everywhere: don't, can't, won't, it's, you'll, we've, they're, I'm, isn't, wasn't, there's.",
  "Vary sentence length. Mix short sentences with longer ones.",
  "Start some sentences with 'And' or 'But'. Real writers do this.",
  "Use active voice. Say 'You can fix this' not 'This can be fixed'.",
  "Use 'I', 'you', 'we' throughout. Write like you're talking to a friend.",
  "Include specific numbers: timeframes, percentages, real metrics.",
  "Write short paragraphs. 2-4 sentences max. Vary paragraph length.",
  "DO NOT use these words: however, moreover, furthermore, in addition, delve, navigate, landscape, tapestry, leverage, utilize, transformative, revolutionize, game-changer, in conclusion, in summary, it is important to note, it's worth noting, multifaceted, ever-evolving, a myriad of.",
  "Don't use em dashes. Use separate sentences instead.",
  "Use occasional sentence fragments for emphasis.",
  "Avoid Oxford commas sometimes. Mix it up.",
  "Don't end every paragraph with a tidy summary. Let some paragraphs end naturally.",
  "Don't write formulaic introductions. Skip 'In today's digital world' or 'In this article, we will'.",
  "Vary how you open paragraphs. Don't start every paragraph the same way.",
  "Use rhetorical questions sparingly. Max 1-2 per article.",
  "The conclusion should be short. Don't repeat what you already said.",
  "Use contractions in headings too when appropriate.",
];

// ---------- helpers ----------
function slug(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function checkTrend(title) {
  const keywords = title.replace(/[^\w\s]/g, "").split(/\s+/).slice(0, 4).join(" ");
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keywords)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { interest: "unknown" };
    const text = await res.text();
    const itemCount = (text.match(/<item>/g) || []).length;
    return { interest: itemCount > 0 ? "confirmed" : "low", results: itemCount };
  } catch {
    return { interest: "unknown" };
  }
}

async function generateRawArticle(topic) {
  const sysPrompt = "You are a tech blogger writing for PraveenTechWorld. The audience is students and office workers who want practical, step-by-step help.\n\n" +
    "RULES (follow these strictly):\n" +
    ANTI_AI_RULES.map((r, i) => `${i + 1}. ${r}`).join("\n") + "\n\n" +
    "Write the article body only. No frontmatter. No '---'. Start with the first section heading using ##.\n" +
    "Include a FAQ section at the end with 3 real questions and answers.";

  const userPrompt = `Write a complete blog article for this topic:

TITLE: ${topic.title}
SEO TITLE: ${topic.seo}
CATEGORY: ${topic.cat}
TAGS: ${topic.tags.join(", ")}
SOCIAL HOOK: ${topic.hook}

Required sections (use ## for headings, ### for subheadings):
## Why This Matters (real-world problem this solves)
## What You Will Learn (4-6 bullet points as learning objectives)
## Step-by-Step Guide (3-5 practical subsections with clear instructions)
## Tips for Best Results (4-6 numbered tips)
## Frequently Asked Questions (3 questions with helpful answers)
## Conclusion (short, don't repeat everything)

The article should be 600-900 words total. Write like a real person sharing what worked for them.`;

  const raw = await callLLM(sysPrompt, userPrompt, { temperature: 0.7, maxTokens: 4096 });
  return raw;
}

async function polishArticle(raw) {
  const sysPrompt = "You are an editor. Your job is to make AI-generated text sound human. You do NOT rewrite the content. You only fix patterns that make text sound robotic.\n\n" +
    "Fix these specific issues:\n" +
    "1. Add contractions where missing (don't, can't, it's, you'll, we've, I'm, there's)\n" +
    "2. Break up sentences that are all the same length\n" +
    "3. Replace overused transitions (however, moreover, furthermore, in addition) with natural ones\n" +
    "4. Remove these words if they appear: delve, navigate, landscape, tapestry, leverage, utilize, transformative, revolutionize, game-changer, in conclusion, in summary\n" +
    "5. Make passive voice active where possible\n" +
    "6. Shorten any paragraph that is more than 5 sentences\n" +
    "7. Remove any 'In today's world' or 'In this article' openings\n" +
    "8. Make sure the conclusion is short and doesn't repeat earlier content\n" +
    "9. If there are em dashes, replace them with periods and start a new sentence\n" +
    "10. Keep the same facts, structure, and meaning. Only change the wording where necessary to sound more human.";

  const polished = await callLLM(sysPrompt, "Polish this article to sound more human. Return the full article with your edits:\n\n" + raw, { temperature: 0.4, maxTokens: 4096 });
  return polished || raw;
}

function generateFrontmatter(topic, publishDate, body) {
  const description = body
    .replace(/## Why This Matters[\s\S]*?## What You Will Learn/, "")
    .replace(/## .+/g, "")
    .replace(/\*\*/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 155);
  const finalDesc = description.length > 10 ? description : topic.title;

  const faqLines = body.split("\n");
  const faqs = [];
  let currentQ = null;
  let currentA = [];
  let inFaq = false;
  for (const line of faqLines) {
    if (line.startsWith("## Frequently Asked Questions")) { inFaq = true; continue; }
    if (inFaq && line.startsWith("## ")) break;
    if (!inFaq) continue;
    const qMatch = line.match(/^\s*(?:\d+[.\)]\s*)?\*{0,2}\s*(.+?\?)\s*\*{0,2}\s*$/);
    if (qMatch) {
      if (currentQ && currentA.length) {
        faqs.push({ question: currentQ.replace(/\*+/g, "").trim(), answer: currentA.join(" ").replace(/\*+/g, "").trim() });
      }
      currentQ = qMatch[1];
      currentA = [];
    } else if (currentQ && line.trim()) {
      currentA.push(line.trim());
    }
  }
  if (currentQ && currentA.length) {
    faqs.push({ question: currentQ.replace(/\*+/g, "").trim(), answer: currentA.join(" ").replace(/\*+/g, "").trim() });
  }
  const faqYaml = faqs.length
    ? "faq:\n" + faqs.map(f => `  - question: "${f.question.replace(/"/g, "'")}"\n    answer: "${f.answer.slice(0, 250).replace(/"/g, "'")}"`).join("\n")
    : "";

  const lines = [
    "---",
    `title: "${topic.title.replace(/"/g, "'")}"`,
    `description: "${finalDesc.replace(/"/g, "'")}"`,
    `publishDate: ${publishDate}`,
    `author: praveen`,
    `category: ${topic.cat}`,
    `tags:`,
    ...topic.tags.map(t => `  - ${t}`),
    `draft: false`,
    `seoTitle: "${topic.seo.replace(/"/g, "'")}"`,
    `socialHook: "${topic.hook.replace(/"/g, "'")}"`,
  ];
  if (faqYaml) lines.push(faqYaml);
  lines.push("---", "");
  return lines.join("\n");
}

// ---------- main ----------
async function main() {
  console.log("\n=== BATCH GENERATOR ===\n");
  console.log(`Generating ${TOPICS.length} articles\n`);

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

  // Date assignment: June 3-7 (10 per day)
  const dates = [];
  const baseDate = new Date(2026, 5, 3); // June 3
  for (let d = 0; d < 5; d++) {
    for (let i = 0; i < 10; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + d);
      dates.push(date);
    }
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < TOPICS.length; i++) {
    const topic = TOPICS[i];
    const pubDate = dates[i];
    const dateStr = formatDate(pubDate);
    const s = slug(topic.title);

    console.log(`\n[${i + 1}/${TOPICS.length}] ${topic.title}`);
    console.log(`  Date: ${dateStr} | Category: ${topic.cat}`);

    // Step A: quick trend check
    console.log("  Checking trends...");
    const trend = await checkTrend(topic.title);
    console.log(`  Trend: ${trend.interest}${trend.results ? ` (${trend.results} news items)` : ""}`);

    // Step B: generate
    console.log("  Generating article...");
    const raw = await generateRawArticle(topic);
    if (!raw) {
      console.log("  FAILED: generation returned null");
      failed++;
      continue;
    }
    fs.writeFileSync(path.join(REPORT_DIR, `${s}-raw.md`), raw, "utf-8");

    // Step C: polish
    console.log("  Polishing...");
    const polished = await polishArticle(raw);
    if (!polished) {
      console.log("  Using raw (polish failed)");
      // fall through with raw
    }

    const finalBody = (polished || raw).trim();
    const frontmatter = generateFrontmatter(topic, dateStr, finalBody);
    const fullArticle = frontmatter + finalBody;

    // Step D: save
    const filePath = path.join(ARTICLES_DIR, `${s}.mdx`);
    fs.writeFileSync(filePath, fullArticle, "utf-8");
    console.log(`  SAVED: src/content/articles/${s}.mdx`);

    success++;
  }

  console.log(`\n=== DONE ===`);
  console.log(`Success: ${success}, Failed: ${failed}, Total: ${TOPICS.length}`);
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
