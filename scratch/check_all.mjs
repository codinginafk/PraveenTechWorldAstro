import Database from 'better-sqlite3';
const db = new Database('mission_control.sqlite');
console.log(db.prepare('SELECT * FROM artifacts').all());
