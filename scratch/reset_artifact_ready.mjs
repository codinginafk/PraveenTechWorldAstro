import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve('mission_control.sqlite'));
db.prepare("UPDATE artifacts SET state = 'READY' WHERE id = 18").run();
console.log("Reset state of Artifact 18 back to READY.");
