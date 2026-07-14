import 'dotenv/config';

async function test() {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tencent/hy3:free",
      max_tokens: 4000,
      messages: [{ role: "user", content: "Write a short paragraph about infinite loops in programming." }],
    }),
  });
  const data = await res.json();
  console.log("Tokens out:", data.usage?.completion_tokens);
  console.log("Content:", data.choices?.[0]?.message?.content);
}

test().catch(console.error);
