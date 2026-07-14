import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "mission_control.sqlite");
const db = new Database(dbPath);

console.log("Columns of evidence table:");
try {
  const columns = db.prepare("PRAGMA table_info(evidence)").all().map(c => c.name);
  console.log(columns);
} catch (e) {
  console.log("Error:", e.message);
}
