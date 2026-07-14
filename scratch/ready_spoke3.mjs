import Database from 'better-sqlite3';
const db = new Database('mission_control.sqlite');
db.prepare("UPDATE artifacts SET state = 'READY' WHERE id = 3").run();
