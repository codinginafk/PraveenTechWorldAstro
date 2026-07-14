// Global fetch is available natively in Node.js

console.log("Fetching OpenRouter models list...");
try {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`Status: ${res.status}`);
  const data = await res.json();
  const freeModels = data.data
    .filter(m => m.id.endsWith(":free") || (m.pricing && parseFloat(m.pricing.prompt) === 0))
    .map(m => ({ id: m.id, name: m.name }));
  console.log("Available Free Models:");
  console.log(JSON.stringify(freeModels, null, 2));
} catch (e) {
  console.error("Failed:", e.message);
}
