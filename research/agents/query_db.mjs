import Database from "better-sqlite3";
import path from "node:path";

const projectRoot = "C:/Users/bunny/Downloads/00Resume/Building_Tech_Website";
const dbPath = path.join(projectRoot, "mission_control.sqlite");

try {
  const db = new Database(dbPath);
  
  // List all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("=== TABLES IN MISSION_CONTROL.SQLITE ===");
  console.log(tables.map(t => t.name).join(", "));

  // Query table rows
  for (const table of tables.map(t => t.name)) {
    console.log(`\n--- Table: ${table} ---`);
    try {
      const count = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get();
      console.log(`Row count: ${count.cnt}`);
      const rows = db.prepare(`SELECT * FROM ${table} LIMIT 10`).all();
      console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
      console.error(`Failed to query ${table}:`, e.message);
    }
  }

} catch (err) {
  console.error("Database connection failed:", err.message);
}
