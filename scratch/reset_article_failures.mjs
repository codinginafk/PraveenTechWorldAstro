import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "mission_control.sqlite");
const db = new Database(dbPath);

const targetId = 7;
console.log(`Resetting failures and state to REVIEWING for Article ID ${targetId}...`);

const res = db.prepare("UPDATE artifacts SET state = 'REVIEWING', consecutive_failures = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(targetId);
console.log(`Changes: ${res.changes}`);

// Let's print the state to verify
const article = db.prepare("SELECT id, state, consecutive_failures FROM artifacts WHERE id = ?").get(targetId);
console.log("Verification - Article:", article);
