import Database from 'better-sqlite3';
const db = new Database('mission_control.sqlite');
console.log(db.prepare("SELECT * FROM cost_ledger WHERE artifact_id = 3 ORDER BY id DESC LIMIT 5").all());
