import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.homedir(), ".omniroute", "storage.sqlite");
const db = new Database(dbPath);

console.log("Checking provider connections status:");
try {
  const rows = db.prepare("SELECT id, provider, is_active, test_status, rate_limited_until, backoff_level, last_error, last_error_type FROM provider_connections").all();
  console.log(rows);
} catch (e) {
  console.log("Error:", e.message);
}
