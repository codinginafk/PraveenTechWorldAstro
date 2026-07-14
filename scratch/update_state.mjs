import Database from 'better-sqlite3';
const db = new Database('./mission_control.sqlite');
db.prepare("UPDATE artifacts SET state = 'VERIFYING' WHERE id = 2").run();
console.log('Transitioned to VERIFYING');
