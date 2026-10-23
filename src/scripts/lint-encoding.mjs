/**
 * lint-encoding.mjs — fail the build on encoding damage in shippable files.
 * encoding-lint: ignore-file  (this file quotes broken sequences on purpose)
 *
 * A PowerShell `Get-Content`/`Set-Content` round-trip decodes a UTF-8 file as
 * ANSI and writes it back as UTF-8-with-BOM. The visible result is mojibake
 * (`—` -> `â€”`, `’` -> `â€™`) plus an invisible BOM at byte 0. That happened
 * once in this repository to three articles and one of them shipped the damage
 * into dist/ before anyone noticed.
 *
 * Scans the shippable tree (src/ + public/) for:
 *   - a leading byte-order mark
 *   - the specific UTF-8-decoded-as-Windows-1252 sequences
 *   - U+FFFD replacement characters (a lossy decode already happened)
 *
 * Lines that deliberately discuss the problem (containing "mojibake") are
 * skipped so an article about encodings is not punished.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ROOTS = ["src", "public"];
const EXTS = new Set([".mdx", ".md", ".astro", ".ts", ".js", ".mjs", ".cjs", ".json", ".css", ".yml", ".yaml", ".txt", ".xml"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".astro", "pagefind"]);

// "â€”" (em dash), "â€™" (right quote), "â€œ/â€\x9d" (quotes), "Ã¢â‚¬" (double-encoded).
// The second alternative is the general shape: a Latin-1 lead byte followed by a
// CP1252 special character, which covers accented letters and emoji too.
const MOJIBAKE =
  /(?:\u00e2\u20ac[\u2018\u2019\u201c\u201d\u2013\u2014\u00a6\u00a0]|\u00c3\u00a2\u00e2\u201a\u00ac|[\u00c2-\u00f4][\u0080-\u00bf\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122])/;
const REPLACEMENT = /\ufffd/;

const problems = [];
const files = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (EXTS.has(path.extname(entry.name).toLowerCase())) files.push(full);
  }
}
ROOTS.forEach((r) => walk(path.join(ROOT, r)));

for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const raw = fs.readFileSync(file, "utf8");

  // Opt-out for files that must quote broken sequences verbatim.
  if (/encoding-lint: ignore-file/.test(raw.slice(0, 400))) continue;

  if (raw.charCodeAt(0) === 0xfeff) {
    problems.push(`${rel}: byte-order mark at start of file`);
    continue;
  }

  const lines = raw.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/mojibake/i.test(line)) continue;
    if (MOJIBAKE.test(line) || REPLACEMENT.test(line)) {
      problems.push(`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`);
    }
  }
}

console.log(`[encoding] scanned ${files.length} files in ${ROOTS.join(", ")}`);
if (problems.length) {
  console.error(`\n❌ encoding lint failed (${problems.length}):`);
  problems.slice(0, 25).forEach((p) => console.error("  - " + p));
  if (problems.length > 25) console.error(`  … and ${problems.length - 25} more`);
  console.error("\nRepair: rewrite the file as UTF-8 without BOM (never round-trip");
  console.error("content through PowerShell Get-Content/Set-Content).");
  process.exit(1);
}
console.log("[encoding] ✅ no BOM, no mojibake, no replacement characters");
