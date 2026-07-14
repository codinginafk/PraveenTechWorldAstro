import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve('mission_control.sqlite'));
const row = db.prepare("SELECT reason FROM transitions_log WHERE artifact_id = 17 AND from_state = 'REVIEWING' ORDER BY timestamp DESC LIMIT 1").get();
console.log(row ? row.reason : 'No row found');
