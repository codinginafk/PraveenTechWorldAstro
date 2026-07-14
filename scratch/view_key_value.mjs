import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.homedir(), ".omniroute", "storage.sqlite");
const db = new Database(dbPath);

console.log("key_value contents:");
try {
  const rows = db.prepare("SELECT * FROM key_value").all();
  console.log(rows);
} catch (e) {
  console.log("Error:", e.message);
}
