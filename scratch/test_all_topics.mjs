import { getDb } from '../scripts/scoutdb.mjs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = await getDb();
  const pendingTopics = await db.all("SELECT * FROM topics WHERE status = 'pending' LIMIT 5");
  console.log(`Found ${pendingTopics.length} pending topics. Running evaluations...`);

  for (const topic of pendingTopics) {
    console.log(`\nEvaluating: "${topic.title}"`);
    const prompt = `Evaluate the topic: ${topic.title}`;
    
    try {
      const res = await fetch("http://localhost:20128/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer omniroute-resilience-key"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          stream: false,
          messages: [{ role: "user", content: prompt }]
        })
      });
      
      const text = await res.text();
      console.log("Status:", res.status);
      console.log("Body snippet:", text.substring(0, 200));
    } catch (err) {
      console.error("Fetch failed:", err.message);
    }
  }
}

run().then(() => process.exit(0)).catch(console.error);
