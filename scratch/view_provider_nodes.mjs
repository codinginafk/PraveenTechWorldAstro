import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.homedir(), ".omniroute", "storage.sqlite");
const db = new Database(dbPath);

console.log("Supported Provider Nodes in OmniRoute:");
const nodes = db.prepare("SELECT id, type, name, prefix, api_type FROM provider_nodes").all();
console.log(nodes);
