// Global fetch is available natively in Node.js

const modelsToTest = [
  { model: "gemini/gemini-1.5-flash" },
  { model: "gemini/gemini-2.5-flash" },
  { model: "gemini/gemini-1.5-pro" },
  { model: "gemini/gemini-2.5-pro" },
  { model: "gemini/gemini-2.0-flash" }
];

for (const { model } of modelsToTest) {
  console.log(`\nTesting OmniRoute routing through ${model}...`);
  try {
    const res = await fetch("http://localhost:20128/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer omniroute-resilience-key",
      },
      body: JSON.stringify({
        model: model,
        allowedConnectionIds: ["conn-gemini"],
        max_tokens: 20,
        stream: false,
        messages: [
          { role: "user", content: "hi" }
        ]
      })
    });
    console.log(`Status: ${res.status}`);
    const data = await res.text();
    console.log("Response snippet:", data.slice(0, 300));
  } catch (err) {
    console.error("Test failed:", err.message);
  }
}
