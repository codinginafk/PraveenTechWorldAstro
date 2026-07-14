import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const dbPath = path.join(os.homedir(), ".omniroute", "storage.sqlite");
const db = new Database(dbPath);

async function run() {
  const fsmKey = db.prepare("SELECT * FROM api_keys WHERE name = 'Antigravity FSM Key'").get();
  if (!fsmKey) {
    console.error("Antigravity FSM Key not found to copy template from!");
    process.exit(1);
  }

  // Check if Praveen key already exists
  const existing = db.prepare("SELECT * FROM api_keys WHERE name = 'Praveen Tech ID'").get();
  if (existing) {
    console.log("Praveen Tech ID already exists:", existing);
    process.exit(0);
  }

  // Create new key values
  const newKey = {
    ...fsmKey,
    id: crypto.randomUUID(),
    name: 'Praveen Tech ID',
    key: 'omniroute-praveentech-key',
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    last_used_at: null
  };

  const columns = Object.keys(newKey);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map(col => newKey[col]);

  db.prepare(`INSERT INTO api_keys (${columns.join(', ')}) VALUES (${placeholders})`).run(...values);
  console.log("Successfully created API Key/ID for Praveen!");
  console.log("Key:", newKey.key);
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
