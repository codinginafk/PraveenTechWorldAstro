import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dbPath = path.join(process.cwd(), "mission_control.sqlite");
const db = new Database(dbPath);

const targetId = 7;
console.log(`Fixing evidence reference labels for Article ID ${targetId}...`);

// Update evidence_ref of firsthand evidence from 'firsthand' to 'EV-000007'
const updateEvidence = db.prepare("UPDATE evidence SET evidence_ref = 'EV-000007' WHERE artifact_id = ? AND source_type = 'firsthand'").run(targetId);
console.log(`Updated evidence_ref changes: ${updateEvidence.changes}`);

// Clear draft file
const draftFilePath = path.join(process.cwd(), "drafts", "7.draft.md");
try {
  fs.writeFileSync(draftFilePath, "", "utf8");
  console.log("Cleared drafts/7.draft.md");
} catch (e) {
  // Ignored
}

// Reset state to WRITING in SQLite
const res = db.prepare("UPDATE artifacts SET state = 'WRITING', draft_path = null, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(targetId);
console.log(`Updated artifact state to WRITING changes: ${res.changes}`);

// Let's print current state and evidence rows to verify
const article = db.prepare("SELECT * FROM artifacts WHERE id = ?").get(targetId);
const evidence = db.prepare("SELECT id, evidence_ref, source_type, title FROM evidence WHERE artifact_id = ?").all(targetId);
console.log("Verification - Article state:", article.state);
console.log("Verification - Evidence rows:", evidence);
