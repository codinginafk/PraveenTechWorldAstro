import fs from 'fs';
import path from 'path';

const dir = 'src/content/articles';

// Build a map of file -> actual h2/h3 headings
const headings = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.mdx'))) {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = c.split('\n').filter(l => l.trim().startsWith('##') || l.trim().startsWith('###'));
  headings[f] = lines.map(l => l.trim());
}

// For each file, print info to decide where to insert
for (const [f, hdgs] of Object.entries(headings)) {
  console.log(`\n=== ${f.substring(0, 45)} ===`);
  for (const h of hdgs) {
    console.log(`  ${h.substring(0, 70)}`);
  }
}
