import Database from 'better-sqlite3';
const db = new Database('mission_control.sqlite');
try {
  db.prepare("UPDATE artifacts SET state = 'OUTLINE', updated_at = CURRENT_TIMESTAMP WHERE id = 3").run();
  console.log("Artifact 3 forcefully transitioned to OUTLINE.");
} catch(e) {
  console.error("Error:", e);
}
