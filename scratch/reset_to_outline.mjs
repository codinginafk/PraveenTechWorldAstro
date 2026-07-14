import Database from "better-sqlite3";
const db = new Database("mission_control.sqlite");

// Force update state for Hub article back to OUTLINE to regenerate draft using full evidence text
db.prepare("UPDATE artifacts SET state = 'OUTLINE', cost_usd_total = 0 WHERE id = 4").run();
console.log("Hub article transitioned back to OUTLINE. Ready to regenerate!");
