const OMNIROUTE_URL = "http://localhost:20128/v1/chat/completions";

const modelsToTest = [
  "cl/anthropic/claude-sonnet-4.6",
  "tllm/CLAUDE_4_6_SONNET",
  "aug/gpt-5.5-medium",
  "cl/google/gemini-3.1-pro-preview",
  "tllm/gemini_3_pro",
  "oc/deepseek-v4-flash-free",
  "cline/moonshotai/kimi-k2.6"
];

for (const model of modelsToTest) {
  console.log(`Testing model: ${model}...`);
  try {
    const res = await fetch(OMNIROUTE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer omniroute-resilience-key"
      },
      body: JSON.stringify({
        model,
        max_tokens: 30,
        messages: [{ role: "user", content: "Say hello in exactly one word." }]
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`  SUCCESS [${model}]:`, data.choices?.[0]?.message?.content?.trim());
    } else {
      console.log(`  FAILED [${model}]: Status ${res.status}`, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.log(`  ERROR [${model}]: ${err.message}`);
  }
}
