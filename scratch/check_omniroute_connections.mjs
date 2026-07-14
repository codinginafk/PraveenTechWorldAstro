import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.homedir(), ".omniroute", "storage.sqlite");
const db = new Database(dbPath);

console.log("Current provider connections:");
const connections = db.prepare("SELECT id, provider, name, api_key, is_active FROM provider_connections").all();
console.log(connections);
