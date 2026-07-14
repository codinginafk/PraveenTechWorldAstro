import Database from "better-sqlite3";
import dotenv from "dotenv";
dotenv.config();

const db = new Database("mission_control.sqlite");
const artifactId = 4;

const artifact = db.prepare("SELECT * FROM artifacts WHERE id = ?").get(artifactId);
const evidence = db.prepare("SELECT * FROM evidence WHERE artifact_id = ?").all(artifactId);

console.log("Topic:", artifact.topic);
console.log("Evidence items count:", evidence.length);

const system = "You are a visual architect. Generate a clean Markdown outline for this topic. Plan where diagrams or visual blocks go (code blocks, text tables, state graphs). Direct citations only.";
const evidenceSummary = evidence.map((e) => `${e.evidence_ref}: ${e.title} (${e.source_url})`).join("\n");
const prompt = `<evidence-bundle>\n${evidenceSummary}\n</evidence-bundle>\n\nTopic: ${artifact.topic}`;

console.log("\nCalling OpenRouter (tencent/hy3:free)...");

try {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tencent/hy3:free",
      max_tokens: 800,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  
  if (!res.ok) {
    console.error("OpenRouter error status:", res.status, await res.text());
  } else {
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    console.log("\n--- GENERATED OUTLINE ---");
    console.log(text);
    console.log("-------------------------");
    console.log("Length of output:", text.length);
  }
} catch (err) {
  console.error("Error calling OpenRouter:", err.message);
}
