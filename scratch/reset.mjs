import Database from 'better-sqlite3';
const db = new Database('mission_control.sqlite');
db.prepare("UPDATE artifacts SET state = 'OUTLINE', review_cycles = 0, research_iterations = 0 WHERE id = 3").run();
console.log("Artifact 3 reset to OUTLINE");
