import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.homedir(), ".omniroute", "storage.sqlite");
const db = new Database(dbPath);

console.log("=== API_KEYS SCHEMA ===");
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='api_keys'").get().sql);

console.log("=== REGISTERED_KEYS SCHEMA ===");
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='registered_keys'").get().sql);
