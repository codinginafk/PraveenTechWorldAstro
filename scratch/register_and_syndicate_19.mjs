import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const db = new Database(path.resolve('mission_control.sqlite'));

// Find next ID
const maxRow = db.prepare("SELECT MAX(id) as maxId FROM artifacts").get();
const nextId = (maxRow.maxId || 0) + 1;
console.log("Next Artifact ID:", nextId);

// Read generated MDX file and strip frontmatter to create the draft backup
const mdxPath = path.resolve('src/content/articles/how-to-tell-if-your-ram-is-bad-step-by-step-guide.mdx');
if (!fs.existsSync(mdxPath)) {
  console.error("MDX file not found:", mdxPath);
  process.exit(1);
}
const mdxContent = fs.readFileSync(mdxPath, 'utf8');
const draftContent = mdxContent.replace(/^---[\s\S]*?---/g, '').trim();

const draftPath = `drafts/how-to-tell-if-your-ram-is-bad-step-by-step-guide.draft.md`;
fs.writeFileSync(path.resolve(draftPath), draftContent, 'utf8');
console.log("Wrote draft backup to:", draftPath);

// Check if already registered
const existing = db.prepare("SELECT * FROM artifacts WHERE topic = ?").get("How to Tell If Your RAM Is Bad: A Step-by-Step PC Diagnostics Guide");
if (existing) {
  console.log("Artifact already exists with ID:", existing.id);
  db.prepare("UPDATE artifacts SET state = 'READY', draft_path = ? WHERE id = ?").run(draftPath, existing.id);
} else {
  // Insert new record
  db.prepare(`
    INSERT INTO artifacts (id, topic, state, pillar, draft_path)
    VALUES (?, ?, 'READY', 'tech-repair-diagnostics', ?)
  `).run(nextId, "How to Tell If Your RAM Is Bad: A Step-by-Step PC Diagnostics Guide", draftPath);
  console.log(`Registered new artifact with ID: ${nextId}`);
}
