import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve('mission_control.sqlite'));

// Print artifacts schema
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name='artifacts'").get();
console.log("Artifacts Schema:", schema.sql);

// Query all columns
const pragma = db.prepare("PRAGMA table_info(artifacts)").all();
console.log("Artifacts columns:", pragma);

// List current ready/unpublished/published counts
const counts = db.prepare("SELECT status, COUNT(*) as count FROM artifacts GROUP BY status").all();
console.log("Current status counts:", counts);
