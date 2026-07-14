import Database from 'better-sqlite3';
const db = new Database('mission_control.sqlite');
console.log(db.prepare("SELECT * FROM failures WHERE artifact_id = 3 ORDER BY id DESC LIMIT 5").all());
