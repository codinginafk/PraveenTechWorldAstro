import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');

async function fixFiles() {
    const files = await fs.readdir(ARTICLES_DIR);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));
    
    let fixedCount = 0;
    
    for (const file of mdxFiles) {
        const filePath = path.join(ARTICLES_DIR, file);
        let content = await fs.readFile(filePath, 'utf-8');
        
        let modified = false;

        // Fix 1: Ensure closing --- exists
        if (content.startsWith('---')) {
            // Find the second ---
            const secondDashIndex = content.indexOf('---', 3);
            if (secondDashIndex === -1) {
                // There is no closing ---. We need to find where the frontmatter ends.
                // Usually, the prose starts with a # heading or regular text.
                // YAML keys don't have spaces at the start, EXCEPT lists/objects.
                // Let's just find the first line that is definitely not YAML.
                const lines = content.split('\n');
                let insertAt = -1;
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    // If it's a markdown heading, that's definitely the prose
                    if (line.startsWith('#')) {
                        insertAt = i;
                        break;
                    }
                }
                
                if (insertAt !== -1) {
                    lines.splice(insertAt, 0, '---');
                    content = lines.join('\n');
                    modified = true;
                    console.log(`[Fixed] Added missing closing --- to ${file}`);
                } else {
                    console.warn(`[Warning] Could not find where to insert closing --- in ${file}`);
                }
            } else {
                // If there is an empty line right after the first ---, remove it, it confuses Astro sometimes
                const lines = content.split('\n');
                if (lines[1] && lines[1].trim() === '') {
                    lines.splice(1, 1);
                    content = lines.join('\n');
                    modified = true;
                    console.log(`[Fixed] Removed blank line at start of YAML in ${file}`);
                }
            }
        }

        // Fix 2: Clean up Mojibake encoding artifacts
        const originalContent = content;
        
        // UTF-8 Mojibake from Windows-1252
        content = content.replace(/â€™/g, "'");
        content = content.replace(/â€“/g, "-");
        content = content.replace(/â€”/g, "--");
        content = content.replace(/â€œ/g, '"');
        content = content.replace(/â€ /g, '"');
        
        // Also just in case standard smart quotes were left
        content = content.replace(/‘/g, "'");
        content = content.replace(/’/g, "'");
        content = content.replace(/“/g, '"');
        content = content.replace(/”/g, '"');
        content = content.replace(/…/g, '...');
        content = content.replace(/—/g, '--');
        
        // Fix the weird specific ones we saw
        content = content.replace(/\?T/g, "'");
        content = content.replace(/\?"/g, "--");
        content = content.replace(/\?/g, "'");
        content = content.replace(/\uFFFD/g, "'");

        if (content !== originalContent) {
            modified = true;
            console.log(`[Fixed] Cleaned encoding artifacts in ${file}`);
        }

        if (modified) {
            await fs.writeFile(filePath, content, 'utf-8');
            fixedCount++;
        }
    }
    
    console.log(`\nFinished! Fixed ${fixedCount} files.`);
}

fixFiles().catch(console.error);
