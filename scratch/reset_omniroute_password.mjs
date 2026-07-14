import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.homedir(), ".omniroute", "storage.sqlite");
const db = new Database(dbPath);

console.log("Resetting OmniRoute dashboard password...");
const res = db.prepare("DELETE FROM key_value WHERE namespace = 'settings' AND key = 'password'").run();
console.log(`Deleted settings.password rows: ${res.changes}`);

console.log("Done! Restart the OmniRoute server to apply INITIAL_PASSWORD.");
