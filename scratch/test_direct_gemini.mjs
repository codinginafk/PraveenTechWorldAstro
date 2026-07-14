// Global fetch is available natively in Node.js

const models = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash-exp"
];

for (const model of models) {
  console.log(`\nTesting direct Google API for model: ${model}...`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "say hello" }] }]
      })
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log("Response snippet:", text.slice(0, 300));
  } catch (err) {
    console.log("Failed:", err.message);
  }
}
