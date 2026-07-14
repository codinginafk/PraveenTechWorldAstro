const OMNIROUTE_URL = "http://localhost:20128/v1/chat/completions";

const model = "cl/anthropic/claude-sonnet-4.6";
console.log(`Testing stream parsing for model: ${model}...`);
try {
  const res = await fetch(OMNIROUTE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer omniroute-resilience-key"
    },
    body: JSON.stringify({
      model,
      max_tokens: 100,
      stream: true,
      messages: [{ role: "user", content: "Tell me a very short joke." }]
    })
  });
  
  if (!res.ok) {
    throw new Error(`Status ${res.status}: ${await res.text()}`);
  }

  let fullText = "";
  let buffer = "";
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // retain incomplete line
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.startsWith("data: ")) {
        const dataStr = cleanLine.slice(6).trim();
        if (dataStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(dataStr);
          const content = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.delta?.reasoning ?? parsed.choices?.[0]?.delta?.reasoning_content ?? "";
          fullText += content;
        } catch (e) {
          // Ignore
        }
      }
    }
  }
  
  console.log("Full reconstructed response text:\n", fullText);
} catch (err) {
  console.log("Error:", err.message);
}
