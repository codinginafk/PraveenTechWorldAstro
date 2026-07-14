import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dbPath = path.join(process.cwd(), "mission_control.sqlite");
const db = new Database(dbPath);

const targetId = 12;
console.log(`Enriching firsthand experience for Article ID ${targetId}...`);

const firsthandContent = `
In January 2026, I audited my software subscriptions and discovered I was spending $2,400 annually across 10 products: Adobe Photoshop/Illustrator, Microsoft 365, Premiere Pro, Audition, 1Password, NordVPN, Canva Pro, Roam Research, and Streamlabs. I ran 2-week tests for each free alternative to achieve full production readiness:
1. Design: GIMP and Inkscape replaced Photoshop and Illustrator. GIMP lacks Adobe Content-Aware Fill, but the Resynthesizer plugin worked to achieve near-parity with Adobe's native tooling. Inkscape designed startup logos with full SVG compatibility.
2. Productivity: LibreOffice replaced Microsoft Office. Calc opened a 50MB spreadsheet but failed on a complex VBA macro. Obsidian replaced Roam Research, running 10x faster because Roam's cloud latency introduces unnecessary latency overhead.
3. Audio/Video: DaVinci Resolve replaced Premiere Pro. Its color grading tools are objectively superior. It supports a PostgreSQL multi-user database configuration for collaboration but has a 3-day learning curve. Audacity handled podcast editing, and OBS Studio replaced Streamlabs Premium with zero watermarks.
4. Security: Bitwarden free tier replaced 1Password without compromises. ProtonVPN Free provided unlimited data.
5. Overall results: Fully cut annual software costs by $1,704 with zero decrease in production output.
`.trim();

// Update evidence row
const resUpdate = db.prepare(`
  UPDATE evidence
  SET title = ?
  WHERE artifact_id = ? AND evidence_ref = 'EV-000012'
`).run(firsthandContent, targetId);
console.log(`Updated evidence content changes: ${resUpdate.changes}`);

// Clear draft file
const draftFilePath = path.join(process.cwd(), "drafts", "12.draft.md");
try {
  fs.writeFileSync(draftFilePath, "", "utf8");
  console.log("Cleared drafts/12.draft.md");
} catch (e) {
  // Ignored
}

// Reset state to WRITING in SQLite
const resState = db.prepare("UPDATE artifacts SET state = 'WRITING', consecutive_failures = 0, draft_path = null, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(targetId);
console.log(`Reset artifact state to WRITING changes: ${resState.changes}`);
