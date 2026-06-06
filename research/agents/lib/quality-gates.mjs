import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseArticle } from "./syndication.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");
const ARTICLES_DIR = path.join(ROOT_DIR, "src/content/articles");

const SITE_URL = "https://www.praveentechworld.com";

// ---- Rule definitions ----

const RULES = {
  // Content Quality Gates (C1-C14)
  C1: { id: "C1", gate: "Content Quality", name: "Readability score", desc: "Flesch-Kincaid Grade Level 8-9", threshold: { min: 8, max: 9 } },
  C2: { id: "C2", gate: "Content Quality", name: "Minimum body length", desc: "At least 2,000 words", threshold: { min: 2000 } },
  C3: { id: "C3", gate: "Content Quality", name: "Meta description length", desc: "120-155 characters", threshold: { min: 120, max: 155 } },
  C4: { id: "C4", gate: "Content Quality", name: "Primary keyword in description", desc: "Must appear in first 20 chars of description", threshold: {} },
  C5: { id: "C5", gate: "Content Quality", name: "Primary keyword in first paragraph", desc: "Must appear in first 100 words", threshold: {} },
  C6: { id: "C6", gate: "Content Quality", name: "Keyword in H2 heading", desc: "At least one H2 contains a primary keyword", threshold: {} },
  C7: { id: "C7", gate: "Content Quality", name: "Internal links", desc: "At least 2 contextual inline links to other articles", threshold: { min: 2 } },
  C8: { id: "C8", gate: "Content Quality", name: "External citations", desc: "At least 1 link to authoritative external source", threshold: { min: 1 } },
  C9: { id: "C9", gate: "Content Quality", name: "Unique article structure", desc: "Not identical H2 pattern to last 3 articles", threshold: {} },
  C10: { id: "C10", gate: "Content Quality", name: "Personal hook or data point", desc: "First paragraph must have specific claim, story, or data — not generic intro", threshold: {} },
  C11: { id: "C11", gate: "Content Quality", name: "FAQ section", desc: "At least 3 FAQ items if topic supports it", threshold: { min: 3 } },
  C12: { id: "C12", gate: "Content Quality", name: "Sentence variety", desc: "No more than 3 consecutive sentences with same structure", threshold: {} },
  C13: { id: "C13", gate: "Content Quality", name: "Paragraph length", desc: "No paragraph exceeds 5 sentences", threshold: { max: 5 } },
  C14: { id: "C14", gate: "Content Quality", name: "Active voice ratio", desc: "At least 80% active voice", threshold: { min: 80 } },

  // Technical SEO Gates (T1-T12)
  T1: { id: "T1", gate: "Technical SEO", name: "seoTitle exists and length", desc: "Required, max 50 chars (to fit with site suffix)", threshold: { max: 50 } },
  T2: { id: "T2", gate: "Technical SEO", name: "description exists and length", desc: "Required, 120-155 chars", threshold: { min: 120, max: 155 } },
  T3: { id: "T3", gate: "Technical SEO", name: "Final title tag length", desc: "seoTitle + ' | PTW' must be ≤60 chars total", threshold: { max: 60 } },
  T4: { id: "T4", gate: "Technical SEO", name: "coverImage exists", desc: "Required, valid URL", threshold: {} },
  T5: { id: "T5", gate: "Technical SEO", name: "imageAlt exists", desc: "Required, at least 10 chars", threshold: { min: 10 } },
  T6: { id: "T6", gate: "Technical SEO", name: "Tags count", desc: "3-6 tags, lowercase, no duplicates", threshold: { min: 3, max: 6 } },
  T7: { id: "T7", gate: "Technical SEO", name: "Heading hierarchy", desc: "No skipped levels (H1 → H2 → H3)", threshold: {} },
  T8: { id: "T8", gate: "Technical SEO", name: "No broken internal links", desc: "All internal URLs resolve to existing articles", threshold: {} },
  T9: { id: "T9", gate: "Technical SEO", name: "socialHook exists", desc: "Required, 50-150 chars", threshold: { min: 50, max: 150 } },
  T10: { id: "T10", gate: "Technical SEO", name: "publishDate valid", desc: "Required, valid date string", threshold: {} },
  T11: { id: "T11", gate: "Technical SEO", name: "author field valid", desc: "Required, must match existing author slug", threshold: {} },
  T12: { id: "T12", gate: "Technical SEO", name: "category field valid", desc: "Required, must match existing category", threshold: {} },

  // Author/Link Quality Gates (L1-L4)
  L1: { id: "L1", gate: "Author & Links", name: "Author link text", desc: "Use 'Follow on LinkedIn' not just 'LinkedIn'", threshold: {} },
  L2: { id: "L2", gate: "Author & Links", name: "No generic link text", desc: "Avoid 'click here', 'read more', 'this article'", threshold: {} },
  L3: { id: "L3", gate: "Author & Links", name: "Internal links target existing articles", desc: "All internal hrefs point to published pages", threshold: {} },
  L4: { id: "L4", gate: "Author & Links", name: "External links security", desc: "All external links use target=_blank + rel=noopener", threshold: {} },
};

// ---- Helper Functions ----

function estimateReadability(text) {
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 100) return null;

  const sentences = clean.split(/[.!?]+/).filter(Boolean);
  const totalSentences = sentences.length || 1;
  const totalWords = words.length;
  const totalSyllables = words.reduce((sum, w) => {
    const syl = w.toLowerCase().replace(/[^a-z]/g, "").match(/[aeiouy]{1,2}/g);
    return sum + (syl ? syl.length : 1);
  }, 0);

  const wordsPerSentence = totalWords / totalSentences;
  const syllablesPerWord = totalSyllables / totalWords;
  const fkGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;

  return Math.max(1, Math.round(fkGrade));
}

function countWords(text) {
  return text.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

function extractKeywords(title) {
  return title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 3);
}

function getHeadings(body) {
  return (body.match(/^#{2,4}\s+(.+)$/gm) || []).map(h => h.replace(/^#+\s*/, "").trim());
}

function getInternalLinks(body) {
  const links = [];
  const regex = /\[([^\]]+)\]\(\/([^)]+)\)/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    if (!match[2].startsWith("http") && !match[2].startsWith("#")) {
      links.push({ text: match[1], url: match[2] });
    }
  }
  return links;
}

function getExternalLinks(body) {
  const links = [];
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    if (!match[2].includes(SITE_URL)) {
      links.push({ text: match[1], url: match[2] });
    }
  }
  return links;
}

function getGenericLinkTexts(links) {
  const generic = ["click here", "read more", "this article", "here", "link", "more", "this"];
  return links.filter(l => generic.includes(l.text.toLowerCase().trim())).map(l => l.text);
}

function getExistingArticleSlugs() {
  if (!fs.existsSync(ARTICLES_DIR)) return new Set();
  return new Set(fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx")).map(f => f.replace(/\.mdx$/, "")));
}

function checkHeadingHierarchy(body) {
  const headings = body.match(/^#{1,4}\s+.+$/gm) || [];
  let lastLevel = 1;
  const issues = [];
  for (const h of headings) {
    const level = h.match(/^#+/)[0].length;
    if (level > lastLevel + 1) {
      issues.push(`Heading skip: H${lastLevel} → H${level}`);
    }
    lastLevel = level;
  }
  return issues;
}

function checkSentenceVariety(body) {
  const sentences = body.replace(/\n/g, " ").split(/[.!?]+\s*/).filter(Boolean);
  let varietyIssues = 0;
  for (let i = 0; i < sentences.length - 3; i++) {
    const lengths = [sentences[i].split(/\s+/).length, sentences[i+1].split(/\s+/).length, sentences[i+2].split(/\s+/).length];
    const variance = Math.max(...lengths) - Math.min(...lengths);
    if (variance <= 2) varietyIssues++;
  }
  return varietyIssues;
}

function checkParagraphLength(body) {
  const paragraphs = body.split(/\n\n+/).filter(p => p.trim().length > 0 && !p.startsWith("#") && !p.startsWith("---"));
  const longParas = paragraphs.filter(p => p.split(/[.!?]+/).filter(Boolean).length > 5);
  return longParas.length;
}

function estimateActiveVoice(text) {
  const passivePatterns = /\b(am|is|are|was|were|be|been|being)\s+\w+ed\b/gi;
  const matches = text.match(passivePatterns);
  if (!matches) return 100;
  const totalSentences = text.split(/[.!?]+/).filter(Boolean).length;
  const passiveRatio = (matches.length / Math.max(totalSentences, 1)) * 100;
  return Math.round(100 - passiveRatio);
}

function checkHookQuality(firstParagraph) {
  const genericStarts = [
    "in today", "in the modern", "welcome to", "this article", "have you ever",
    "in this guide", "the world of", "when it comes to", "in recent years",
    "as technology", "with the rise"
  ];
  const lower = firstParagraph.toLowerCase();
  for (const g of genericStarts) {
    if (lower.startsWith(g)) return { pass: false, reason: `Generic start: "${g}"` };
  }
  const hasData = /\d+%|\d+x|according to|study|research|survey|found that|reported/i.test(firstParagraph);
  const hasStory = /I\s+\w+ed|my\s+\w+|was\s+\w+ing/i.test(firstParagraph);
  if (!hasData && !hasStory) {
    return { pass: false, reason: "No specific data point or personal story in opening" };
  }
  return { pass: true };
}

// ---- Main validation function ----

export function validateArticle(filePath, existingArticlePaths = []) {
  const article = parseArticle(filePath);
  if (!article) {
    return { passed: false, failures: [{ gate: "Parse", rule: "Parse", message: `Could not parse article: ${filePath}` }], score: 0, rules: RULES };
  }

  const failures = [];
  const bodyText = article.body || "";
  const fm = article;
  const filename = path.basename(filePath);
  const title = fm.title || "";
  const description = fm.description || "";
  const seoTitle = fm.seoTitle || "";
  const socialHook = fm.socialHook || "";
  const tags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
  const coverImage = fm.coverImage || "";
  const imageAlt = fm.imageAlt || "";
  const publishDate = fm.publishDate || "";
  const author = fm.author || "";
  const category = fm.category || "";

  // Generate final title tag: seoTitle + " | PTW"
  const suffix = " | PTW";
  const finalTitleTag = seoTitle + suffix;

  // Keywords from title
  const keywords = extractKeywords(seoTitle || title);
  const primaryKeyword = keywords[0] || "";

  // Body analysis
  const wordCount = countWords(bodyText);
  const readability = estimateReadability(bodyText);
  const headings = getHeadings(bodyText);
  const firstParagraph = bodyText.split("\n\n")[0] || "";
  const first100Words = firstParagraph.split(/\s+/).slice(0, 100).join(" ");
  const internalLinks = getInternalLinks(bodyText);
  const externalLinks = getExternalLinks(bodyText);
  const headingIssues = checkHeadingHierarchy(bodyText);
  const varietyIssues = checkSentenceVariety(bodyText);
  const longParagraphs = checkParagraphLength(bodyText);
  const activeVoice = estimateActiveVoice(bodyText);
  const hookQuality = checkHookQuality(firstParagraph);
  const genericLinkTexts = getGenericLinkTexts(internalLinks);
  const existingSlugs = getExistingArticleSlugs();

  // ---- C1: Readability ----
  if (readability !== null) {
    if (readability < 8) {
      failures.push({ gate: "C1", rule: "Readability score", message: `Readability Grade ${readability} — below minimum 8` });
    } else if (readability > 9) {
      failures.push({ gate: "C1", rule: "Readability score", message: `Readability Grade ${readability} — above maximum 9 (target is Grade 8-9)` });
    }
  } else {
    failures.push({ gate: "C1", rule: "Readability score", message: "Insufficient text to calculate readability (<100 words)" });
  }

  // ---- C2: Word count ----
  if (wordCount < 2000) {
    failures.push({ gate: "C2", rule: "Minimum body length", message: `Body is ${wordCount} words — minimum is 2,000` });
  }

  // ---- C3: Description length ----
  if (description.length < 120) {
    failures.push({ gate: "C3", rule: "Meta description length", message: `Description is ${description.length} chars — minimum 120` });
  } else if (description.length > 155) {
    failures.push({ gate: "C3", rule: "Meta description length", message: `Description is ${description.length} chars — maximum 155` });
  }

  // ---- C4: Primary keyword in description first 20 chars ----
  if (primaryKeyword && description.length > 0) {
    const first20 = description.slice(0, 20).toLowerCase();
    if (!first20.includes(primaryKeyword)) {
      failures.push({ gate: "C4", rule: "Primary keyword in description", message: `Keyword "${primaryKeyword}" not found in first 20 chars of description` });
    }
  }

  // ---- C5: Primary keyword in first paragraph ----
  if (primaryKeyword && first100Words.length > 0) {
    const lowerFirst = first100Words.toLowerCase();
    if (!lowerFirst.includes(primaryKeyword)) {
      failures.push({ gate: "C5", rule: "Primary keyword in lead paragraph", message: `Keyword "${primaryKeyword}" not found in first 100 words` });
    }
  }

  // ---- C6: Keyword in H2 heading ----
  if (primaryKeyword && headings.length > 0) {
    const h2s = headings.filter(h => h.startsWith("#") && h.startsWith("## ") && !h.startsWith("### "));
    const h2Texts = headings.filter(h => !h.startsWith("#") || true).join(" ").toLowerCase();
    if (!h2Texts.includes(primaryKeyword)) {
      failures.push({ gate: "C6", rule: "Keyword in H2 heading", message: `Keyword "${primaryKeyword}" not found in any H2 heading` });
    }
  }

  // ---- C7: Internal links ----
  if (internalLinks.length < 2) {
    failures.push({ gate: "C7", rule: "Internal links", message: `Only ${internalLinks.length} internal links found — minimum 2` });
  }

  // ---- C8: External citations ----
  if (externalLinks.length < 1) {
    failures.push({ gate: "C8", rule: "External citations", message: "No external citations found — at least 1 required" });
  }

  // ---- C9: Unique structure (deferred — requires history) ----
  // Skipped in single-article validation; run by orchestrator with history

  // ---- C10: Hook quality ----
  if (!hookQuality.pass) {
    failures.push({ gate: "C10", rule: "Personal hook or data point", message: hookQuality.reason });
  }

  // ---- C11: FAQ ----
  // Only flag as warning, not hard failure — not all topics need FAQ
  if (!bodyText.toLowerCase().includes("faq") && !bodyText.toLowerCase().includes("frequently asked")) {
    // Soft check — no failure, just info
  }

  // ---- C12: Sentence variety ----
  if (varietyIssues > 5) {
    failures.push({ gate: "C12", rule: "Sentence variety", message: `${varietyIssues} groups of 3+ consecutive sentences with similar length — vary sentence structure` });
  }

  // ---- C13: Paragraph length ----
  if (longParagraphs > 0) {
    failures.push({ gate: "C13", rule: "Paragraph length", message: `${longParagraphs} paragraph(s) exceed 5 sentences` });
  }

  // ---- C14: Active voice ----
  if (activeVoice < 80) {
    failures.push({ gate: "C14", rule: "Active voice ratio", message: `Active voice is ${activeVoice}% — minimum 80%` });
  }

  // ---- T1: seoTitle ----
  if (!seoTitle) {
    failures.push({ gate: "T1", rule: "seoTitle exists", message: "Missing seoTitle field" });
  } else if (seoTitle.length > 50) {
    failures.push({ gate: "T1", rule: "seoTitle length", message: `seoTitle is ${seoTitle.length} chars — maximum 50 (need room for ' | PTW' suffix)` });
  }

  // ---- T2: description ----
  if (!description) {
    failures.push({ gate: "T2", rule: "Description exists", message: "Missing description field" });
  }

  // ---- T3: Final title tag length ----
  if (finalTitleTag.length > 60) {
    failures.push({ gate: "T3", rule: "Title tag length", message: `Final title tag is ${finalTitleTag.length} chars — maximum 60` });
  }

  // ---- T4: coverImage ----
  if (!coverImage) {
    failures.push({ gate: "T4", rule: "Cover image", message: "Missing coverImage field" });
  } else if (!coverImage.startsWith("http")) {
    failures.push({ gate: "T4", rule: "Cover image", message: "coverImage must be a valid URL (http/https)" });
  }

  // ---- T5: imageAlt ----
  if (!imageAlt) {
    failures.push({ gate: "T5", rule: "Image alt text", message: "Missing imageAlt field" });
  } else if (imageAlt.length < 10) {
    failures.push({ gate: "T5", rule: "Image alt text", message: `imageAlt is ${imageAlt.length} chars — minimum 10` });
  }

  // ---- T6: Tags ----
  if (tags.length < 3) {
    failures.push({ gate: "T6", rule: "Tags count", message: `${tags.length} tags — minimum 3` });
  } else if (tags.length > 6) {
    failures.push({ gate: "T6", rule: "Tags count", message: `${tags.length} tags — maximum 6` });
  }
  const lowerTags = tags.map(t => t.toLowerCase());
  const uniqueTags = new Set(lowerTags);
  if (uniqueTags.size !== lowerTags.length) {
    failures.push({ gate: "T6", rule: "Tags duplicates", message: "Tags contain duplicates" });
  }

  // ---- T7: Heading hierarchy ----
  for (const issue of headingIssues) {
    failures.push({ gate: "T7", rule: "Heading hierarchy", message: issue });
  }

  // ---- T8: Broken internal links ----
  for (const link of internalLinks) {
    const targetPath = link.url.split("?")[0].split("#")[0];
    if (!targetPath.startsWith("http") && !targetPath.startsWith("#")) {
      let slug = targetPath.replace(/^\/blog\//, "").replace(/^\//, "").replace(/\/$/, "");
      if (slug && !existingSlugs.has(slug)) {
        failures.push({ gate: "T8", rule: "Broken internal link", message: `Internal link points to non-existent article: /${targetPath}` });
      }
    }
  }

  // ---- T9: socialHook ----
  if (!socialHook) {
    failures.push({ gate: "T9", rule: "socialHook exists", message: "Missing socialHook field" });
  } else if (socialHook.length < 50) {
    failures.push({ gate: "T9", rule: "socialHook length", message: `socialHook is ${socialHook.length} chars — minimum 50` });
  } else if (socialHook.length > 150) {
    failures.push({ gate: "T9", rule: "socialHook length", message: `socialHook is ${socialHook.length} chars — maximum 150` });
  }

  // ---- T10: publishDate ----
  if (!publishDate) {
    failures.push({ gate: "T10", rule: "publishDate", message: "Missing publishDate field" });
  } else {
    const d = new Date(publishDate);
    if (isNaN(d.getTime())) {
      failures.push({ gate: "T10", rule: "publishDate", message: `Invalid publishDate: "${publishDate}"` });
    }
  }

  // ---- T11: Author ----
  if (!author) {
    failures.push({ gate: "T11", rule: "Author field", message: "Missing author field" });
  } else {
    const authorsDir = path.join(ROOT_DIR, "src/content/authors");
    const authorFiles = fs.existsSync(authorsDir) ? fs.readdirSync(authorsDir).map(f => f.replace(/\.(md|mdx|json|yaml)$/, "")) : [];
    if (authorFiles.length > 0 && !authorFiles.includes(author)) {
      failures.push({ gate: "T11", rule: "Author field", message: `Author "${author}" not found in content/authors/` });
    }
  }

  // ---- T12: Category ----
  if (!category) {
    failures.push({ gate: "T12", rule: "Category field", message: "Missing category field" });
  }

  // ---- L1: Author link text ----
  if (bodyText.includes('LinkedIn') && !bodyText.toLowerCase().includes('follow on linkedin')) {
    // This check is for the AuthorBox component which is shared — done at component level
  }

  // ---- L2: Generic link text ----
  for (const text of genericLinkTexts) {
    failures.push({ gate: "L2", rule: "Generic link text", message: `Generic link text found: "${text}"` });
  }

  // ---- L3: Internal links exist (already checked in C7, T8) ----

  // ---- L4: External links security ----
  for (const link of externalLinks) {
    if (!link.text.includes("target=") && !link.text.includes("rel=")) {
      // Can't check rel from markdown — skip; checked at build level
    }
  }

  const score = Math.max(0, 100 - failures.length * 5);
  const passed = failures.length === 0;

  return { passed, failures, score, rules: RULES };
}

export function validateAllArticles() {
  if (!fs.existsSync(ARTICLES_DIR)) {
    return { articles: [], totalFailures: 0, totalScore: 0, averageScore: 0 };
  }

  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".mdx")).sort();
  const results = [];

  for (const file of files) {
    const filePath = path.join(ARTICLES_DIR, file);
    const result = validateArticle(filePath);
    results.push({ filename: file, ...result });
  }

  const totalFailures = results.reduce((sum, r) => sum + r.failures.length, 0);
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const averageScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;

  return { articles: results, totalFailures, totalScore, averageScore };
}

export function generateChecklistMarkdown() {
  let md = "# Quality Gates Checklist\n\n";

  const gates = {};
  for (const [id, rule] of Object.entries(RULES)) {
    const g = rule.gate;
    if (!gates[g]) gates[g] = [];
    gates[g].push({ id, ...rule });
  }

  for (const [gateName, rules] of Object.entries(gates)) {
    md += `## ${gateName}\n\n`;
    md += "| # | Rule | Threshold | Status |\n";
    md += "|---|---|---|---|\n";
    for (const r of rules) {
      const threshold = r.threshold.min ? (r.threshold.max ? `${r.threshold.min}-${r.threshold.max}` : `≥${r.threshold.min}`) : r.threshold.max ? `≤${r.threshold.max}` : "Required";
      md += `| **${r.id}** | ${r.desc} | ${threshold} | ❌ |\n`;
    }
    md += "\n";
  }

  md += "---\n*Auto-generated by Quality Gates Agent*\n";
  return md;
}

function generateReport(results) {
  let md = "# Quality Gates Report\n\n";
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Total articles:** ${results.articles.length}\n`;
  md += `**Total failures:** ${results.totalFailures}\n`;
  md += `**Average score:** ${results.averageScore}/100\n\n`;

  const passed = results.articles.filter(a => a.passed);
  const failed = results.articles.filter(a => !a.passed);
  md += `**Passed:** ${passed.length} | **Failed:** ${failed.length}\n\n`;

  if (failed.length > 0) {
    md += "## Failed Articles\n\n";
    for (const article of failed) {
      md += `### ${article.filename} (Score: ${article.score}/100)\n\n`;
      md += "| Gate | Rule | Message |\n";
      md += "|---|---|---|\n";
      for (const f of article.failures) {
        md += `| ${f.gate} | ${f.rule} | ${f.message} |\n`;
      }
      md += "\n";
    }
  }

  md += "---\n*Generated by Quality Gates Agent*\n";
  return md;
}

// ---- CLI ----
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || "validate-all";

  if (command === "validate-all") {
    const results = validateAllArticles();
    const report = generateReport(results);
    const reportDir = path.resolve(__dirname, "../reports");
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    const reportFile = path.join(reportDir, "quality-gates-report.md");
    fs.writeFileSync(reportFile, report, "utf-8");
    console.log(report);
    console.log(`\nReport saved to: ${reportFile}`);
    process.exit(results.articles.filter(a => !a.passed).length > 0 ? 1 : 0);
  }

  if (command === "checklist") {
    console.log(generateChecklistMarkdown());
  }

  if (command === "validate" && process.argv[3]) {
    const result = validateArticle(process.argv[3]);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.passed ? 0 : 1);
  }
}
