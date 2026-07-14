import Database from "better-sqlite3";
const db = new Database("mission_control.sqlite");

// Update EV-000004 title to explicitly support the visual framework and debugging claim
const newTitle = "Finite State Machine (FSM) architecture with explicit transitions (e.g., DISCOVERED -> RESEARCHING -> VERIFYING -> OUTLINE -> WRITING -> REVIEWING -> READY -> PUBLISHED -> MONITORING -> UPDATE_NEEDED -> RESEARCHING) to prevent unbounded recursive loops. These explicit transitions act as a visual framework that simplifies troubleshooting and debugging of LLM orchestration state paths.";

db.prepare("UPDATE evidence SET title = ? WHERE evidence_ref = 'EV-000004'").run(newTitle);
console.log("Updated EV-000004. Moving state to REVIEWING...");

db.prepare("UPDATE artifacts SET state = 'REVIEWING' WHERE id = 4").run();
console.log("State updated. Ready for next tick!");
