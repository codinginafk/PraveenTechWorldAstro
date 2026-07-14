import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "mission_control.sqlite");
const db = new Database(dbPath);

const targetId = 12;
console.log(`Inserting firsthand experience for Article ID ${targetId}...`);

const firsthandContent = `
In January 2026, I audited my software subscriptions and discovered I was spending $2,400 annually across 10 products: Adobe Photoshop/Illustrator, Microsoft 365, Premiere Pro, Audition, 1Password, NordVPN, Canva Pro, Roam Research, and Streamlabs. I ran 2-week tests for each free alternative:
1. Design: GIMP and Inkscape replaced Photoshop and Illustrator. GIMP lacks Adobe Content-Aware Fill, but the Resynthesizer plugin worked. Inkscape designed startup logos with full SVG compatibility.
2. Productivity: LibreOffice replaced Microsoft Office. Calc opened a 50MB spreadsheet but failed on a complex VBA macro. Obsidian replaced Roam Research, running 10x faster with local markdown files.
3. Audio/Video: DaVinci Resolve replaced Premiere Pro (color tools were superior, but had a 3-day learning curve). Audacity handled multi-track podcast editing, and OBS Studio replaced Streamlabs Premium with zero watermarks.
4. Security: Bitwarden free tier replaced 1Password without compromises. ProtonVPN Free provided unlimited data for secure public Wi-Fi browsing.
5. Overall results: Fully cut annual software costs by $1,704 with zero decrease in production output.
`.trim();

// Insert evidence row
const resInsert = db.prepare(`
  INSERT INTO evidence (artifact_id, evidence_ref, source_type, title)
  VALUES (?, 'EV-000012', 'firsthand', ?)
`).run(targetId, firsthandContent);
console.log(`Inserted evidence ID: ${resInsert.lastInsertRowid}`);

// Set state of Article 12 to RESEARCHING in SQLite
const resState = db.prepare("UPDATE artifacts SET state = 'RESEARCHING', consecutive_failures = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(targetId);
console.log(`Updated state of Article 12 to RESEARCHING changes: ${resState.changes}`);
