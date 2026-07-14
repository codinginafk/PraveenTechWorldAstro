import Database from 'better-sqlite3';
const db = new Database('mission_control.sqlite');
console.log("Total evidence rows:", db.prepare("SELECT count(*) as count FROM evidence").get().count);
console.log("Evidence sample:", db.prepare("SELECT * FROM evidence LIMIT 2").all());
