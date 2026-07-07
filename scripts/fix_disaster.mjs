import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');

async function fixDisaster() {
    const files = await fs.readdir(ARTICLES_DIR);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));
    
    let fixedCount = 0;
    for (const file of mdxFiles) {
        const filePath = path.join(ARTICLES_DIR, file);
        let content = await fs.readFile(filePath, 'utf-8');
        
        let originalContent = content;
        
        // Restore --- which became -?"
        content = content.replace(/-\?"\r?\n/g, '---\n');
        
        // What about FAQ questions? They originally ended with ?" like question: "Can I do X?"
        // They became question: "Can I do X?"
        // Wait, if they were question: "Can I do X-- (after first script)
        // Then fix_yaml_crash.mjs replaced -- with ?"
        // So question: "Can I do X?" is now CORRECT!
        // The ONLY problem is that --- became -?"
        
        if (content !== originalContent) {
            await fs.writeFile(filePath, content, 'utf-8');
            fixedCount++;
            console.log(`Fixed disaster in ${file}`);
        }
    }
    console.log(`Fixed ${fixedCount} files`);
}

fixDisaster().catch(console.error);
