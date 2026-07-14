import Database from 'better-sqlite3';
const db = new Database('./mission_control.sqlite');
db.prepare("UPDATE artifacts SET state = 'READY' WHERE id = 2").run();
console.log('Artifact 2 set to READY');
