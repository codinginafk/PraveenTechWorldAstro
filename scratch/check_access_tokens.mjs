import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.homedir(), ".omniroute", "storage.sqlite");
const db = new Database(dbPath);

console.log("=== cli_access_tokens ===");
console.log(db.prepare("SELECT * FROM cli_access_tokens").all());
