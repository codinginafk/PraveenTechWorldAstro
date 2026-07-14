import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "mission_control.sqlite");
const db = new Database(dbPath);

console.log("In-flight artifacts in database:");
const inFlight = db.prepare(`SELECT id, topic, state, consecutive_failures FROM artifacts WHERE state NOT IN ('NEEDS_HUMAN_REVIEW', 'UPDATE_NEEDED')`).all();
console.log(inFlight);
