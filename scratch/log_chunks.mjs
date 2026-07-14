const OMNIROUTE_URL = "http://localhost:20128/v1/chat/completions";

const model = "oc/deepseek-v4-flash-free";
console.log(`Logging chunks for: ${model}...`);
try {
  const res = await fetch(OMNIROUTE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer omniroute-resilience-key"
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      stream: true,
      messages: [{ role: "user", content: "Say hello in 5 words." }]
    })
  });

  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    const text = decoder.decode(chunk, { stream: true });
    console.log("CHUNK:", JSON.stringify(text));
  }
} catch (err) {
  console.log("Error:", err.message);
}
