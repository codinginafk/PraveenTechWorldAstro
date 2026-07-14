import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.homedir(), ".omniroute", "storage.sqlite");
const db = new Database(dbPath);

console.log("=== TABLE SCHEMAS ===");
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
for (const t of tables) {
  console.log(`\nTable: ${t.name}`);
  console.log(t.sql);
}
