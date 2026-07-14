import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.homedir(), ".omniroute", "storage.sqlite");
const db = new Database(dbPath);

console.log("Clearing rate limits and errors for conn-gemini in OmniRoute database...");
try {
  const res = db.prepare("UPDATE provider_connections SET rate_limited_until = null, backoff_level = 0, last_error = null, last_error_type = null WHERE id = 'conn-gemini'").run();
  console.log(`Changes: ${res.changes}`);
} catch (e) {
  console.log("Error:", e.message);
}
