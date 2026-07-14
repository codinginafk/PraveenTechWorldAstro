import { syndicate } from "../scripts/syndicator.mjs";
import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "mission_control.sqlite");
const db = new Database(dbPath);

async function run() {
  const readyArtifacts = db.prepare("SELECT id, topic FROM artifacts WHERE state = 'READY'").all();
  console.log(`Found ${readyArtifacts.length} artifacts in READY state. Starting syndication...`);

  for (let i = 0; i < readyArtifacts.length; i++) {
    const art = readyArtifacts[i];
    
    // Add a 35-second delay between articles to avoid Dev.to rate limits (except for the first one)
    if (i > 0) {
      console.log(`Waiting 35 seconds to respect Dev.to rate limit...`);
      await new Promise(r => setTimeout(r, 35000));
    }
    
    console.log(`\n=============================================`);
    console.log(`Publishing Artifact ${art.id}: "${art.topic}"`);
    console.log(`=============================================`);
    try {
      // Choose tags based on article topic
      let tags = ["ai", "automation"];
      if (art.topic.toLowerCase().includes("android") || art.topic.toLowerCase().includes("battery") || art.topic.toLowerCase().includes("phone")) {
        tags = ["android", "mobile", "tech", "troubleshooting"];
      } else if (art.topic.toLowerCase().includes("tls") || art.topic.toLowerCase().includes("security") || art.topic.toLowerCase().includes("server") || art.topic.toLowerCase().includes("cert")) {
        tags = ["security", "devops", "linux", "automation"];
      }
      
      const result = await syndicate(art.id, { tags });
      console.log(`Successfully syndicated Artifact ${art.id}!`);
    } catch (err) {
      console.error(`Failed to syndicate Artifact ${art.id}:`, err.message);
    }
  }
  console.log("\nAll ready artifacts processed!");
}

run().then(() => process.exit(0)).catch(err => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
