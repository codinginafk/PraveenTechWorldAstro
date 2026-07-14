import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "mission_control.sqlite");
const db = new Database(dbPath);

const targetId = 15;
console.log(`Inserting firsthand experience for Article ID ${targetId}...`);

const firsthandContent = `
In January 2026, I automated server health monitoring across a cluster of 12 Ubuntu 24.04 production web servers using a DeepSeek-orchestrated telemetry collector.
1. Script design: Collected metric indicators including CPU load averages, disk partitions usage (warning flagged if >85% capacity), RAM allocation metrics (warning triggered if <500MB free), and active systemd service units.
2. Alerting: Script automatically routes structured JSON performance metrics to a DeepSeek API endpoint for diagnostic summaries, then sends real-time system warnings directly via Discord webhooks.
3. Edge cases and fixes: Handled system cron scheduling permissions, log rotation directory locking issues, and configured automated fallback configurations in cases of network telemetry packet losses.
`.trim();

// Insert evidence row
const resInsert = db.prepare(`
  INSERT INTO evidence (artifact_id, evidence_ref, source_type, title)
  VALUES (?, 'EV-000015', 'firsthand', ?)
`).run(targetId, firsthandContent);
console.log(`Inserted evidence ID: ${resInsert.lastInsertRowid}`);

// Set state of Article 15 to RESEARCHING in SQLite
const resState = db.prepare("UPDATE artifacts SET state = 'RESEARCHING', consecutive_failures = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(targetId);
console.log(`Updated state of Article 15 to RESEARCHING changes: ${resState.changes}`);
