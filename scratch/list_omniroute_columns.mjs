import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.homedir(), ".omniroute", "storage.sqlite");
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (const table of tables) {
  const name = table.name;
  const columns = db.prepare(`PRAGMA table_info(${name})`).all().map(c => c.name);
  console.log(`Table: ${name} -> Columns: ${columns.join(", ")}`);
}
