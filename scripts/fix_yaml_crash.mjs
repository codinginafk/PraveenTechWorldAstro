import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');

async function fixYaml() {
    const files = await fs.readdir(ARTICLES_DIR);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));
    
    let fixedCount = 0;
    for (const file of mdxFiles) {
        const filePath = path.join(ARTICLES_DIR, file);
        let content = await fs.readFile(filePath, 'utf-8');
        
        let originalContent = content;
        
        // Fix the broken quotes from the bad regex replace(/\?"/g, "--")
        content = content.replace(/--\r?\n/g, '?"\n');
        
        // Also fix where a question mark was replaced by an apostrophe at the end of a sentence
        // Example: "right'" -> "right?" or "work'" -> "work?"
        content = content.replace(/([a-zA-Z])'\s*\n/g, '$1?\n');
        content = content.replace(/([a-zA-Z])'\s+([A-Z])/g, '$1? $2');

        if (content !== originalContent) {
            await fs.writeFile(filePath, content, 'utf-8');
            fixedCount++;
            console.log(`Fixed ${file}`);
        }
    }
    console.log(`Fixed ${fixedCount} files`);
}

fixYaml().catch(console.error);
