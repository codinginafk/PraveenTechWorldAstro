import fs from 'fs';
import path from 'path';

const dir = 'src/content/articles';

// Given a filepath, return the body content (after frontmatter)
function getBodyContent(filepath) {
  const c = fs.readFileSync(filepath, 'utf8');
  // split on ---\n to find frontmatter boundary
  const parts = c.split('---\n');
  if (parts.length >= 3) {
    return parts.slice(2).join('---\n');
  }
  return c;
}

// Insert text after a search string in the full content
function insertAfter(content, search, insert) {
  const idx = content.indexOf(search);
  if (idx === -1) return null;
  return content.slice(0, idx + search.length) + insert + content.slice(idx + search.length);
}

// Find a unique anchor string that exists in the body by searching for a known substring
function findAnchor(body, fragment) {
  const idx = body.indexOf(fragment);
  if (idx === -1) return null;
  // Find the complete sentence/line containing this fragment
  const before = body.lastIndexOf('.', idx);
  const after = body.indexOf('.', idx);
  const start = before === -1 ? 0 : before;
  const end = after === -1 ? body.length : after + 1;
  return body.slice(start, end).trim();
}

// Read each file and find anchor points
console.log('Reading files to find anchor points...\n');

const actions = [];

for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.mdx'))) {
  const filepath = path.join(dir, f);
  const fullContent = fs.readFileSync(filepath, 'utf8');
  const body = getBodyContent(filepath);
  
  // Find frontmatter end position
  const parts = fullContent.split('---\n');
  const bodyStart = parts.length >= 3 ? parts.slice(0, 2).join('---\n').length + 4 : 0; // length up to body
  
  // Now I need to find insertion points in the full content (not just body)
  // that correspond to body positions
  
  const fileActions = [];
  
  // Try to find short unique ASCII fragments and build anchors
  const lines = body.split('\n').filter(l => l.trim());
  
  // For each line, try to find a good anchor - a period-ending sentence
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue; // skip headings
    if (trimmed.startsWith('*') || trimmed.startsWith('-')) continue; // skip list items
    if (trimmed.startsWith('>')) continue; // skip blockquotes
    if (trimmed.length < 30) continue;
    
    // Find sentences ending with period
    const sentences = trimmed.match(/[^.!?]+[.!?]+/g);
    if (!sentences) continue;
    
    for (const s of sentences) {
      const clean = s.trim();
      if (clean.length > 25 && clean.length < 200 && !clean.includes('[')) {
        // Check if this sentence exists in the full content
        const idx = fullContent.indexOf(clean);
        if (idx >= bodyStart) {
          fileActions.push({ sentence: clean, idx });
        }
      }
    }
  }
  
  console.log(`${f.substring(0, 45)}: ${fileActions.length} potential anchor sentences in body`);
  actions.push({ file: f, anchors: fileActions, bodyStart });
}

// Now we have potential anchors for each file. Let's check first file
const first = actions[0];
console.log('\nFirst file anchors sample:');
for (const a of first.anchors.slice(0, 5)) {
  console.log(`  "${a.sentence.substring(0, 70)}..." at offset ${a.idx}`);
}
