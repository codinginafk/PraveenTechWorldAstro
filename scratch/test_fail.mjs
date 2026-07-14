async function run() {
  const prompt = `
You are a Principal Research Intelligence Agent for an Enterprise IT Blog.
Your author has run enterprise infrastructure for 700+ users across 35+ branches using Python, SQL, Active Directory, and DeepSeek.

Evaluate the following topic hypothesis and its evidence.
Topic: Ask HN: Add flag for AI-generated articles
Evidence Summary: Ask HN: Add flag for AI-generated articles
Sources: news.ycombinator.com

Score this topic on a scale of 0-100 overall confidence based on these criteria:
1. Evidence Diversity (Does it have docs + github + reddit + official sources?)
2. Personal Expertise (Can an Enterprise IT Admin write about this uniquely?)
3. Competitive Intelligence (Can we beat generic SEO sites on this?)
4. Search Intent (Are real people likely searching for this topic right now?)

Return a strict JSON object:
{
  "confidence_score": 85,
  "analysis": "Brief reasoning",
  "missing_evidence": "What else do we need to search for?",
  "editorial_angle": "One unique angle to write about",
  "suggested_title": "A compelling, click-worthy title with year and specificity",
  "target_queries": ["query1", "query2", "query3"]
}
`;

  const OMNIROUTE_URL = "http://localhost:20128/v1/chat/completions";
  const res = await fetch(OMNIROUTE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer omniroute-resilience-key"
    },
    body: JSON.stringify({
      model: "openrouter/free",
      stream: false,
      messages: [{ role: "user", content: prompt }]
    })
  });

  console.log("Status:", res.status);
  console.log("Headers:", Object.fromEntries(res.headers.entries()));
  const text = await res.text();
  console.log("Body:", text);
}

run().catch(console.error);
