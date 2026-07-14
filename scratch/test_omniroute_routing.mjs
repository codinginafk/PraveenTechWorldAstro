// Using global fetch

console.log("Testing OmniRoute routing through tencent/hy3:free...");

const run = async () => {
  try {
    const res = await fetch("http://localhost:20128/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer omniroute-resilience-key"
      },
      body: JSON.stringify({
        model: "openrouter/tencent/hy3:free",
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
};

run();
