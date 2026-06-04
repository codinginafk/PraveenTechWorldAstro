import { callLLM } from "./shared.mjs";

const CONTENT_PILLARS = [
  "ai-tools", "ai-workflows", "productivity", "windows-fixes",
  "android-fixes", "career-growth", "automation", "privacy", "security", "free-software",
];

export function titlePassesSpec(title) {
  const checks = {
    hasKeyword: true, // LLM will determine
    emotionTrigger: /stop|secret|hack|free|vs|guide|how.to|best|never|why|your|remove|delete|protect|fix/i.test(title),
    isQuestion: /^(how|what|why|when|where|can|do|does|is|are|should|will)/i.test(title),
    lengthOk: title.length >= 20 && title.length <= 120,
    noClickbait: !/you.won't.believe|shocking|mind.blowing/i.test(title),
  };
  const passCount = Object.values(checks).filter(Boolean).length;
  return { score: passCount / Object.keys(checks).length, checks };
}

export async function llmScoreTopic(topic, existingArticles) {
  const sysPrompt = `You are an SEO and content strategist for PraveenTechWorld, a site that helps students and office workers solve practical tech problems.

Score this topic 1-10. pillarFit MUST be EXACTLY one of: ${CONTENT_PILLARS.join(", ")}. If none fit, pick the closest.

Return ONLY valid JSON: { "searchDemand": number, "depthPotential": number, "questionValue": number, "pillarFit": string, "virality": number, "originality": number, "overallScore": number, "seoTitle": string, "recommendedTags": string[] }`;

  const userPrompt = `Topic: "${topic.title || topic}"
Source: ${topic.source || "Unknown"}
Snippet: ${(topic.snippet || "").slice(0, 300)}

Existing article titles: ${existingArticles.join("; ") || "None"}

Output JSON only.`;

  try {
    const result = await callLLM(sysPrompt, userPrompt, { temperature: 0.3, maxTokens: 2048 });
    const cleaned = result.replace(/```json|```/g, "").trim();
    const braceStart = cleaned.indexOf("{");
    const braceEnd = cleaned.lastIndexOf("}");
    const jsonStr = braceStart !== -1 && braceEnd !== -1 ? cleaned.slice(braceStart, braceEnd + 1) : cleaned;

    // Try to extract pillar and scores from raw text if JSON fails
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
