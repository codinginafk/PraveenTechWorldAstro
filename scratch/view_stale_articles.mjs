import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "mission_control.sqlite");
const db = new Database(dbPath);

console.log("Stale articles (artifacts) in UPDATE_NEEDED state:");
try {
  const rows = db.prepare("SELECT id, topic, state, pillar, clicks, impressions FROM artifacts WHERE state = 'UPDATE_NEEDED'").all();
  console.log(rows);
} catch (e) {
  console.log("Error:", e.message);
}
