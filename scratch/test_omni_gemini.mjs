async function testModel(modelName) {
  console.log(`Testing OmniRoute call with ${modelName}...`);
  try {
    const res = await fetch("http://localhost:20128/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer omniroute-resilience-key"
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 50,
        stream: false,
        messages: [
          { role: "user", content: "Say hello!" }
        ]
      })
    });
    console.log(`- Model: ${modelName} -> Status: ${res.status}`);
    const data = await res.json();
    if (res.ok) {
      console.log(`  Response: ${data.choices?.[0]?.message?.content}`);
    } else {
      console.log(`  Error: ${data.error?.message?.slice(0, 150)}`);
    }
  } catch (err) {
    console.error(`- Model: ${modelName} -> Fetch failed: ${err.message}`);
  }
}

async function run() {
  const models = [
    "gemini/gemini-2.5-pro",
    "gemini/gemini-3.5-flash",
    "gemini/gemini-3.1-pro-preview",
    "gemini/gemini-3.1-flash-lite-preview",
    "gemini/gemini-3-pro-preview"
  ];
  for (const m of models) {
    await testModel(m);
  }
}

run();
