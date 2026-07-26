import { callLLM } from "./shared.mjs";

const CONTENT_PILLARS = [
  "website-setup", "windows-fixes", "hosting-infra", "ai-websites",
  "ai-automation", "it-operations", "build-in-public",
];

const E_E_A_T_CRITERIA = [
  "Experience: Does the topic lend itself to first-hand experience, real examples, personal workflow?",
  "Expertise: Does the topic require deep technical knowledge? Can we demonstrate credentials?",
  "Authoritativeness: Are there authoritative sources, documentation, or industry recognition to cite?",
  "Trustworthiness: Can we provide accurate, transparent, honest advice without exaggeration?",
  "WindowsFocus: Topics about Windows troubleshooting, system repair, reinstalling, resetting, driver issues, BSODs, malware removal, and performance fixes get +2 bonus.",
];

// High-CTR Patterns derived from GSC Ground Truth Data
const WINNING_PATTERNS = [
  { name: 'Exact Hex/BSOD Error Code (GSC 12.5% CTR)', regex: /0x[0-9a-fA-F]{3,8}|event\s*id\s*\d+|clock_watchdog_timeout|kmode_exception/i, weight: 3.5 },
  { name: 'Zero-Agency / Direct Practical Hook', regex: /without agency|no retainer|step-by-step|how i|workbench|direct 1-on-1/i, weight: 3.0 },
  { name: 'Hyper-Local UAE Context', regex: /bur dubai|al karama|dubai|noon|amazon uae/i, weight: 2.5 },
  { name: 'Concrete Number / Specificity', regex: /\b\d+\s*(fixes|steps|tools|ways|seconds|mins|kb)\b/i, weight: 2.0 }
];

const PENALTY_PATTERNS = [
  { name: 'Spammy Broad Head Term (GSC 0% CTR Bot Trap)', regex: /^best\s+.*(managers|tools|software|services)\s+2026$/i, weight: -3.5 },
  { name: 'Vague AI Buzzword / Fluff', regex: /ultimate guide|comprehensive|mastering|unlocking|game-changer|delve/i, weight: -2.5 }
];

/**
 * Validates Title, H1, H2s, and Slug URL against proven GSC CTR & intent rules.
 */
export function scoreTitleAndStructure(title, firstParagraph = "", h2List = [], slug = "") {
  let score = 5.0; // Base score
  const matches = [];
  const penalties = [];

  // 1. Title GSC Pattern Scoring
  WINNING_PATTERNS.forEach(p => {
    if (p.regex.test(title)) {
      score += p.weight;
      matches.push(`${p.name} (+${p.weight})`);
    }
  });

  PENALTY_PATTERNS.forEach(p => {
    if (p.regex.test(title)) {
      score += p.weight;
      penalties.push(`${p.name} (${p.weight})`);
    }
  });

  // Length Check (Optimal SERP Title Length: 45 - 65 chars)
  if (title.length >= 45 && title.length <= 65) {
    score += 1.0;
    matches.push('Optimal SERP Length 45-65 chars (+1.0)');
  } else if (title.length > 70) {
    score -= 1.5;
    penalties.push(`Title Too Long: ${title.length} chars (Mobile SERP Truncation) (-1.5)`);
  }

  // 2. First Paragraph Keyword Front-Loading
  if (firstParagraph) {
    const first15Words = firstParagraph.split(/\s+/).slice(0, 15).join(" ");
    if (/0x[0-9a-fA-F]{3,8}|bur dubai|al karama|dubai|it consultant|seo consultant|fix/i.test(first15Words)) {
      score += 1.5;
      matches.push('First-Paragraph Keyword Front-Loading (+1.5)');
    }
  }

  // 3. H2 Subheading Technical Verbatim Check
  if (h2List.length > 0) {
    const hasTechnicalH2 = h2List.some(h2 => /0x[0-9a-fA-F]{3,8}|\d+\.|faq|schema|speed|step-by-step/i.test(h2));
    if (hasTechnicalH2) {
      score += 1.0;
      matches.push('Technical Verbatim / Step H2 Subheadings (+1.0)');
    }
  }

  // 4. Slug Optimization Check
  if (slug) {
    if (slug.length <= 60 && !/ultimate|comprehensive|best-/i.test(slug)) {
      score += 1.0;
      matches.push('Clean Hyphenated Slug URL (+1.0)');
    } else if (slug.length > 75) {
      score -= 1.0;
      penalties.push(`Slug URL Too Long: ${slug.length} chars (-1.0)`);
    }
  }

  const finalScore = Math.max(0, Math.min(10, score)).toFixed(1);
  return {
    score: parseFloat(finalScore),
    passed: parseFloat(finalScore) >= 7.0,
    matches,
    penalties,
    title,
    slug
  };
}

export function titlePassesSpec(title) {
  const structured = scoreTitleAndStructure(title);
  const checks = {
    hasKeyword: true,
    emotionTrigger: WINNING_PATTERNS.some(p => p.regex.test(title)),
    isQuestion: /^(how|what|why|when|where|can|do|does|is|are|should|will)/i.test(title),
    lengthOk: title.length >= 25 && title.length <= 70,
    noClickbait: !/you.won't.believe|shocking|mind.blowing/i.test(title),
  };
  return { score: structured.score / 10, checks, structured };
}

export async function llmScoreTopic(topic, existingArticles, cxResults = [], relatedSources = []) {
  const sysPrompt = `You are an SEO and content strategist for PraveenTechWorld, a site that helps students and office workers fix their computers.

Score this topic 1-10. PREFER "windows-fixes" pillar for any Windows/troubleshooting topic. pillarFit MUST be EXACTLY one of: ${CONTENT_PILLARS.join(", ")}. If none fit, pick the closest.

E-E-A-T + WindowsFocus criteria to consider:
${E_E_A_T_CRITERIA.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Return ONLY valid JSON: { "searchDemand": number, "depthPotential": number, "questionValue": number, "pillarFit": string, "virality": number, "originality": number, "overallScore": number, "seoTitle": string, "recommendedTags": string[], "eeatScore": number }`;

  const cxContext = cxResults.length > 0
    ? `\nCompetitor search results:\n${cxResults.slice(0, 5).map((r) => `- ${r.title} (${r.source}): ${r.snippet}`).join("\n")}`
    : "";

  const sourceContext = relatedSources.length > 0
    ? `\nRelated news/articles on this topic:\n${relatedSources.map((s) => `- ${s.title} (${s.source})`).join("\n")}`
    : "";

  const userPrompt = `Topic: "${topic.title || topic}"
Source: ${topic.source || "Unknown"}
Snippet: ${(topic.snippet || "").slice(0, 300)}${cxContext}${sourceContext}

Existing article titles: ${existingArticles.join("; ") || "None"}

Output JSON only.`;

  try {
    const result = await callLLM(sysPrompt, userPrompt, { temperature: 0.3, maxTokens: 2048 });
    const cleaned = result.replace(/```json|```/g, "").trim();
    const braceStart = cleaned.indexOf("{");
    const braceEnd = cleaned.lastIndexOf("}");
    const jsonStr = braceStart !== -1 && braceEnd !== -1 ? cleaned.slice(braceStart, braceEnd + 1) : cleaned;

    let json;
    try {
      json = JSON.parse(jsonStr);
    } catch {
      const maybeScore = jsonStr.match(/(?:overallScore|score)[^\d]*(\d+)/i);
      const maybePillar = jsonStr.match(/(?:pillarFit|pillar)[^\w]*(\w[\w-]+)/i);
      const maybeTitle = jsonStr.match(/(?:seoTitle|title)[^"]*"([^"]+)"/i);
      json = {
        searchDemand: parseInt(jsonStr.match(/searchDemand[^\d]*(\d)/i)?.[1]) || 6,
        depthPotential: parseInt(jsonStr.match(/depthPotential[^\d]*(\d)/i)?.[1]) || 6,
        questionValue: parseInt(jsonStr.match(/questionValue[^\d]*(\d)/i)?.[1]) || 6,
        pillarFit: maybePillar?.[1] || "unknown",
        virality: parseInt(jsonStr.match(/virality[^\d]*(\d)/i)?.[1]) || 5,
        originality: parseInt(jsonStr.match(/originality[^\d]*(\d)/i)?.[1]) || 6,
        overallScore: parseInt(maybeScore?.[1]) || parseInt(jsonStr.match(/\b(\d+)\s*\/\s*10/)?.[1]) || 6,
        seoTitle: maybeTitle?.[1] || (topic.title || "").slice(0, 60),
        recommendedTags: (jsonStr.match(/"([^"]+)"(?=[^}]*tags)/i)?.[1] || "").split(",").filter(Boolean),
      };
    }
    return { ...json, topic };
  } catch (err) {
    return {
      searchDemand: 5,
      depthPotential: 5,
      questionValue: 5,
      pillarFit: "unknown",
      virality: 3,
      originality: 5,
      overallScore: 5,
      seoTitle: (topic.title || "").replace(/&amp;|&lt;|&gt;|&quot;|&#\d+;/g, "").replace(/<[^>]+>/g, "").replace(/- \w+$/, "").slice(0, 60).trim() || "",
      recommendedTags: [],
      topic,
    };
  }
}
