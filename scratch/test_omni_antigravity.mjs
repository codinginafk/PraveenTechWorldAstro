async function test() {
  console.log("Testing OmniRoute call with antigravity/gemini-3.1-pro-high...");
  try {
    const res = await fetch("http://localhost:20128/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer omniroute-resilience-key"
      },
      body: JSON.stringify({
        model: "antigravity/gemini-3.1-pro-high",
        max_tokens: 50,
        stream: false,
        messages: [
          { role: "user", content: "Say hello!" }
        ]
      })
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

test();
