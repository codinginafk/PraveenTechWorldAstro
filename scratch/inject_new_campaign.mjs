import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scoutDb = new Database(path.join(__dirname, '..', 'scripts', 'scoutdb.sqlite'));
const mcDb = new Database(path.join(__dirname, '..', 'mission_control.sqlite'));

const topicsToInject = [
  {
    scoutId: 'top_REVCVUxMIFRvb2xpbmcg',
    topicName: 'DEBULL Tooling Abuses Microsoft Device-Code Flow to Target M365 Accounts',
    pillar: 'B', // Security / Identity
    scoutScore: 0.85
  },
  {
    scoutId: 'test_1',
    topicName: 'Docker Desktop licensing changes',
    pillar: 'C', // Licensing / DevOps / Infrastructure
    scoutScore: 0.85
  }
];

function generateRef() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `EV-${rand}`;
}

for (const t of topicsToInject) {
  // Check if already exists in MC
  const existing = mcDb.prepare("SELECT * FROM artifacts WHERE topic = ?").get(t.topicName);
  if (existing) {
    console.log(`Artifact "${t.topicName}" already exists in Mission Control with ID ${existing.id}.`);
    continue;
  }

  // 1. Insert into artifacts
  const info = mcDb.prepare(
    "INSERT INTO artifacts (topic, pillar, scout_score, state) VALUES (?, ?, ?, 'DISCOVERED')"
  ).run(t.topicName, t.pillar, t.scoutScore);
  
  const artifactId = info.lastInsertRowid;
  console.log(`Created artifact ID ${artifactId} for "${t.topicName}".`);

  // 2. Fetch evidence from scoutdb
  const scoutEv = scoutDb.prepare("SELECT * FROM evidence WHERE topic_id = ?").all(t.scoutId);
  for (const ev of scoutEv) {
    const ref = generateRef();
    mcDb.prepare(
      `INSERT INTO evidence (artifact_id, evidence_ref, source_url, source_type, title, confidence, content_hash) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      artifactId,
      ref,
      ev.url,
      ev.source_domain,
      ev.title,
      ev.weight, // mapping weight to confidence
      'hash_' + ref
    );
    console.log(`  Linked evidence "${ev.title}" (Ref: ${ref}) to artifact ID ${artifactId}.`);
  }

  // 3. Insert transitions log
  mcDb.prepare(
    "INSERT INTO transitions_log (artifact_id, from_state, to_state, reason) VALUES (?, NULL, 'DISCOVERED', 'Injected from RIE ScoutDB')"
  ).run(artifactId);
}

console.log("Injection complete.");
