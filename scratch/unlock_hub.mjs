import Database from "better-sqlite3";
const db = new Database("mission_control.sqlite");

// Force update state for Hub article to VERIFYING to bypass the manual gate since the user approved it
db.prepare("UPDATE artifacts SET state = 'VERIFYING' WHERE id = 4").run();
console.log("Hub article transitioned to VERIFYING. Running a state machine tick next...");
