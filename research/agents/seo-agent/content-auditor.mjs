import fs from "fs";
import path from "path";
import { SEO_CONFIG, ARTICLES_DIR } from "./config.mjs";

function stripFrontmatter(mdx) {
  // Remove BOM and normalize line endings
  const cleaned = mdx.replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  const match = cleaned.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: cleaned };
  const fmLines = match[1].split("\n");
  const fm = {};
  for (const line of fmLines) {
    const eqIdx = line.indexOf(":");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    else if (val.startsWith("[") && val.endsWith("]")) {
      val = val.slice(1, -1).split(",").map((v) => v.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    }
    fm[key] = val;
  }
  return { frontmatter: fm, body: match[2] };
}

function countWords(text) {
  return text.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

function estimateReadability(text) {
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 100) return { score: 0, level: "insufficient_text", sentences: 0, wordsPerSentence: 0, syllablesPerWord: 0 };

  const sentences = clean.split(/[.!?]+/).filter(Boolean);
  const totalSentences = sentences.length || 1;
  const totalWords = words.length;
  const totalSyllables = words.reduce((sum, w) => {
    const syl = w.toLowerCase().replace(/[^a-z]/g, "").match(/[aeiouy]{1,2}/g);
    return sum + (syl ? syl.length : 1);
  }, 0);

  const wordsPerSentence = totalWords / totalSentences;
  const syllablesPerWord = totalSyllables / totalWords;

  // Approximate Flesch-Kincaid Grade Level
  const fkGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  const gradeLevel = Math.max(1, Math.round(fkGrade));

  let level;
  if (gradeLevel <= 6) level = "very_easy";
  else if (gradeLevel <= 8) level = "easy";
  else if (gradeLevel <= 10) level = "moderate";
  else if (gradeLevel <= 12) level = "fairly_difficult";
  else level = "difficult";

  return { score: gradeLevel, level, sentences: totalSentences, wordsPerSentence: Math.round(wordsPerSentence * 10) / 10, syllablesPerWord: Math.round(syllablesPerWord * 100) / 100 };
}

function checkKeywordUsage(frontmatter, body) {
  const issues = [];
  const title = (frontmatter.title || "").toLowerCase();
  const desc = (frontmatter.description || "").toLowerCase();
  const bodyText = body.toLowerCase();

  // Extract key terms from title
  const words = title.replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 3);
  const uniqueWords = [...new Set(words)];

  // Check if key terms appear in first paragraph
  const firstPara = bodyText.split("\n\n")[0] || "";
  for (const word of uniqueWords.slice(0, 3)) {
    if (firstPara.includes(word)) continue;
    issues.push({ type: "keyword_not_in_lead", severity: "LOW", page: frontmatter.title, message: `Key word "${word}" not found in first paragraph` });
  }

  // Check description contains keywords
  for (const word of uniqueWords.slice(0, 3)) {
    if (desc.includes(word)) continue;
    issues.push({ type: "keyword_not_in_description", severity: "MEDIUM", page: frontmatter.title, message: `Key word "${word}" not in meta description` });
  }

  return issues;
}

function checkFaQSchema(body) {
  const issues = [];
  const hasQ = /^Q:/im.test(body);
  const hasQuestion = /^##?\s+FAQ/im.test(body) || /^##?\s+.*(?:faq|questions|q\s*&?\s*a)/im.test(body);
  if (!hasQ && !hasQuestion) {
    // Not every article needs FAQ, but check for question patterns
    return issues;
  }
  return issues;
}

export function auditArticle(filePath) {
  const findings = [];
  const mdx = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = stripFrontmatter(mdx);
  const slug = path.basename(filePath, ".mdx");

  // Word count
  const wordCount = countWords(body);
  if (wordCount < SEO_CONFIG.minWordCount) {
    findings.push({ type: "thin_content", severity: "HIGH", page: slug, message: `Thin content: ${wordCount} words (min ${SEO_CONFIG.minWordCount})` });
  } else if (wordCount < SEO_CONFIG.idealWordCount) {
    findings.push({ type: "short_content", severity: "LOW", page: slug, message: `Content could be deeper: ${wordCount} words (ideal ${SEO_CONFIG.idealWordCount}+)` });
  }

  // Readability
  const readability = estimateReadability(body);
  if (readability.level === "difficult") {
    findings.push({ type: "readability_high", severity: "MEDIUM", page: slug, message: `Hard to read: Grade ${readability.score} level (aim for Grade 8-10 for general audience)` });
  } else if (readability.level === "fairly_difficult") {
    findings.push({ type: "readability_elevated", severity: "LOW", page: slug, message: `Readability: Grade ${readability.score} level` });
  }

  // Keyword usage
  findings.push(...checkKeywordUsage(frontmatter, body));

  // Description length
  const desc = frontmatter.description || "";
  if (desc && desc.length > SEO_CONFIG.descMax) {
    findings.push({ type: "frontmatter_desc_long", severity: "MEDIUM", page: slug, message: `Frontmatter description is ${desc.length} chars (max ${SEO_CONFIG.descMax})` });
  }

  // Check for missing seoTitle
  const seoTitle = frontmatter.seoTitle || "";
  if (!seoTitle) {
    findings.push({ type: "missing_seo_title", severity: "LOW", page: slug, message: "No seoTitle in frontmatter (title will be used instead)" });
  }

  // Check publishDate
  if (!frontmatter.publishDate) {
    findings.push({ type: "missing_publish_date", severity: "HIGH", page: slug, message: "Missing publishDate in frontmatter" });
  }

  return findings;
}

export async function runContentAudit() {
  const findings = [];

  if (!fs.existsSync(ARTICLES_DIR)) {
    findings.push({ type: "no_articles_dir", severity: "CRITICAL", page: "/", message: `Articles directory not found: ${ARTICLES_DIR}` });
    return findings;
  }

  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx"));
  findings.push({ type: "article_count", severity: "INFO", page: "/", message: `Audited ${files.length} articles` });

  for (const file of files) {
    const filePath = path.join(ARTICLES_DIR, file);
    const articleFindings = auditArticle(filePath);
    findings.push(...articleFindings);
  }

  return findings;
}
