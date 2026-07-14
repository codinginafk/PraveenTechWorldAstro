import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dbPath = path.join(process.cwd(), "mission_control.sqlite");
const db = new Database(dbPath);

const targetId = 7;
console.log(`Resetting Article ID ${targetId} back to WRITING state...`);

// Clean the empty draft file
const draftFilePath = path.join(process.cwd(), "drafts", "7.draft.md");
try {
  fs.writeFileSync(draftFilePath, "", "utf8");
  console.log("Cleared drafts/7.draft.md");
} catch (e) {
  // Ignored if file doesn't exist
}

// Reset state in SQLite
const res = db.prepare("UPDATE artifacts SET state = 'WRITING', draft_path = null, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(targetId);
console.log(`Updated state in database: changes = ${res.changes}`);

// Let's verify
const row = db.prepare("SELECT * FROM artifacts WHERE id = ?").get(targetId);
console.log("Current database row:", row);
