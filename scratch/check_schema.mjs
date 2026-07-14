import Database from 'better-sqlite3';
const db = new Database('mission_control.sqlite');
console.log(db.prepare("PRAGMA table_info(artifacts)").all());
