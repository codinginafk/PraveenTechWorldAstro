import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.homedir(), ".omniroute", "storage.sqlite");
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(`Total tables: ${tables.length}`);
// Print first 20 tables schema
tables.slice(0, 20).forEach(table => {
  const name = table.name;
  const columns = db.prepare(`PRAGMA table_info(${name})`).all().map(c => c.name);
  console.log(`Table: ${name} -> Columns: ${columns.join(", ")}`);
});
