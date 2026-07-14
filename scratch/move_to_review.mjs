import Database from "better-sqlite3";
const db = new Database("mission_control.sqlite");

db.prepare("UPDATE artifacts SET state = 'REVIEWING', consecutive_failures = 0 WHERE id = 4").run();
console.log("Reset state of Artifact 4 to REVIEWING and consecutive_failures to 0.");
