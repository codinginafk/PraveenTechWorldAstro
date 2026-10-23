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
        content = content.replace(/-\?"/g, '---');
        
        if (content !== originalContent) {
            await fs.writeFile(filePath, content, 'utf-8');
            fixedCount++;
            console.log(`Fixed disaster in ${file}`);
        }
    }
    console.log(`Fixed ${fixedCount} files`);
}

fixDisaster().catch(console.error);
