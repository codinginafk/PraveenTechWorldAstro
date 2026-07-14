// Global fetch is available natively in Node.js

console.log("Testing OmniRoute routing through google/gemini-2.5-flash...");
try {
  const res = await fetch("http://localhost:20128/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer omniroute-resilience-key",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      allowedConnectionIds: ["conn-openrouter"],
      max_tokens: 50,
      stream: false,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say hello!" }
      ]
    })
  });
  console.log(`Status: ${res.status}`);
  const data = await res.text();
  console.log("Response:", data);
} catch (err) {
  console.error("Test failed:", err.message);
}
