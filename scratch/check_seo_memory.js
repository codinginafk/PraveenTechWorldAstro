import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve('seo_memory.sqlite'));
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables in seo_memory.sqlite:", tables);

for (const table of tables) {
  const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE name='${table.name}'`).get();
  console.log(`\nSchema for ${table.name}:`, schema.sql);
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
  console.log(`Row count for ${table.name}:`, count.count);
  const sample = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
  console.log(`Sample rows for ${table.name}:`, sample);
}
