const OMNIROUTE_URL = "http://localhost:20128/v1/chat/completions";

const model = "cl/google/gemini-3.1-pro-preview";
console.log(`Testing raw output for model: ${model}...`);
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
      stream: true,
      messages: [{ role: "user", content: "Say hello." }]
    })
  });
  
  const text = await res.text();
  console.log("Response Status:", res.status);
  console.log("Response Headers Content-Type:", res.headers.get("content-type"));
  console.log("First 300 chars of response body:\n", text.slice(0, 300));
} catch (err) {
  console.log("Error:", err.message);
}
