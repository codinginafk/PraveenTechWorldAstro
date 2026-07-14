import Database from "better-sqlite3";
const db = new Database("mission_control.sqlite");

db.prepare("UPDATE artifacts SET state = 'OUTLINE', consecutive_failures = 0, cost_usd_total = 0 WHERE id = 4").run();
console.log("Reset state of Artifact 4 to OUTLINE and consecutive_failures to 0.");
