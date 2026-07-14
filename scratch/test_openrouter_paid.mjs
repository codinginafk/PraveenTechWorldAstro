import "dotenv/config";
// Global fetch is available natively in Node.js

console.log("Checking OpenRouter key status and querying paid model...");
const apiKey = process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error("No OpenRouter API key found in environment!");
  process.exit(1);
}

// 1. Check limits / balance
try {
  const limitRes = await fetch("https://openrouter.ai/api/v1/headers", {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  console.log("Headers Check Status:", limitRes.status);
  const data = await limitRes.json();
  console.log("Limits Data:", JSON.stringify(data, null, 2));
} catch (e) {
  console.error("Limits check failed:", e.message);
}

// 2. Query paid model
try {
  const chatRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      max_tokens: 20,
      messages: [{ role: "user", content: "hi" }]
    })
  });
  console.log("\nQuery Paid Model Status:", chatRes.status);
  const chatData = await chatRes.text();
  console.log("Query Response:", chatData.slice(0, 300));
} catch (e) {
  console.error("Chat check failed:", e.message);
}
