import dotenv from "dotenv";
dotenv.config();

const models = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp"
];

for (const model of models) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "ping" }] }]
      })
    });
    console.log(`Model: ${model} -> Status: ${res.status}`);
    if (!res.ok) {
      console.log(`  Error: ${await res.text()}`);
    }
  } catch (err) {
    console.log(`Model: ${model} -> Exception: ${err.message}`);
  }
}
