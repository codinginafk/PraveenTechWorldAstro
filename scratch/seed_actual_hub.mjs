import Database from 'better-sqlite3';
const mcDb = new Database('mission_control.sqlite');
const scoutDb = new Database('scripts/scoutdb.sqlite');

try {
  // Insert Hub Artifact
  const topic = "Cost Caps & Retry Limits for LLM Agent Pipelines";
  const pillar = "A"; // Hub is Pillar A
  
  const info = mcDb.prepare(
    "INSERT INTO artifacts (topic, pillar, scout_score, state, cluster_id, cluster_role) VALUES (?, ?, ?, 'DISCOVERED', 2, 'HUB')"
  ).run(topic, pillar, 0.99);

  const newId = info.lastInsertRowid;
  
  // Update Cluster record
  scoutDb.prepare("UPDATE clusters SET hub_artifact_id = ? WHERE id = 2").run(newId);
  
  console.log(`Seeded Hub artifact with ID ${newId}`);
} catch (e) {
  console.error("Failed:", e);
}
