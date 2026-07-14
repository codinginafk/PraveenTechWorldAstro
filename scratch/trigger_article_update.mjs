import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "mission_control.sqlite");
const db = new Database(dbPath);

const targetId = 7;
console.log(`Transitioning Article ID ${targetId} to RESEARCHING state...`);

try {
  const result = db.prepare("UPDATE artifacts SET state = 'RESEARCHING', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(targetId);
  console.log(`Changes: ${result.changes}`);
  
  const article = db.prepare("SELECT * FROM artifacts WHERE id = ?").get(targetId);
  console.log("Updated article row:", article);
} catch (e) {
  console.log("Error:", e.message);
}
