import "dotenv/config";

const LLM_API_KEY = process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY;
const LLM_MODEL = "tencent/hy3:free";

const EXTRACTION_SYSTEM_PROMPT = `You are an SEO intelligence analyst. Given forum posts or blog articles about SEO, extract actionable signals that a content creator should know about.

For each signal, determine:
1. signal_text: A concise, actionable insight (1-2 sentences max)
2. confidence: Rate 0.0 to 1.0 based on:
   - Official Google source → 0.9+
   - Corroborated by multiple independent reports → 0.7-0.8
   - Single credible anecdotal report → 0.4-0.6
   - Speculation or rumor → 0.1-0.3
3. category: One of: algorithm_update, penalty, ranking_factor, content_quality, technical_seo, e_e_a_t, ai_content, link_building, schema_markup

Return ONLY a valid JSON object: {"signals": [{"signal_text": "...", "confidence": 0.X, "category": "..."}]}
If no actionable signals are found, return: {"signals": []}
Do not include markdown formatting or backticks around the JSON.`;

async function callLLM(systemPrompt, userPrompt, maxTokens = 800) {
  if (!LLM_API_KEY) throw new Error("[SEOScout] Missing LLM_API_KEY / OPENROUTER_API_KEY in .env");

  const attempt = async (model) => {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  };

  return await attempt(LLM_MODEL);
}

const testPrompt = `Analyze this post and extract actionable SEO signals:

Source: search_engine_roundtable
Title: Google March 2024 Core Update Has Finished Rolling Out
Body: Google has confirmed that the massive March 2024 Core Update is finally complete, 45 days after it started. They claim it resulted in a 45% reduction in low-quality, unhelpful content in search results, exceeding their original 40% estimate. The update heavily targeted scaled content abuse (AI spam) and expired domain abuse. Sites hit by the Helpful Content Update (HCU) previously have largely not recovered, confirming Google's stance that recovery takes months of sustained quality improvement.
URL: https://www.seroundtable.com/google-march-2024-core-update-done-37294.html`;

(async () => {
    console.log("Calling LLM...");
    const raw = await callLLM(EXTRACTION_SYSTEM_PROMPT, testPrompt);
    console.log("RAW OUTPUT:");
    console.log(raw);
})();
