import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');

async function fixQuotes() {
    const files = await fs.readdir(ARTICLES_DIR);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));
    
    let fixedCount = 0;
    for (const file of mdxFiles) {
        const filePath = path.join(ARTICLES_DIR, file);
        let content = await fs.readFile(filePath, 'utf-8');
        
        let originalContent = content;
        
        const lines = content.split('\n');
        let inFrontmatter = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.trim() === '---') {
                inFrontmatter = !inFrontmatter;
                continue;
            }
            
            if (inFrontmatter) {
                // Check if the line is a string property like key: "value"
                const match = line.match(/^(\s*-?\s*[a-zA-Z0-9_]+:\s*)"(.*)"\s*$/);
                if (match) {
                    const prefix = match[1];
                    let value = match[2];
                    
                    // If there are unescaped double quotes inside the value, replace them with single quotes
                    if (value.includes('"')) {
                        value = value.replace(/"/g, "'");
                        lines[i] = `${prefix}"${value}"`;
                    }
                }
            }
        }
        
        content = lines.join('\n');
        
        if (content !== originalContent) {
            await fs.writeFile(filePath, content, 'utf-8');
            fixedCount++;
            console.log(`Fixed quotes in ${file}`);
        }
    }
    console.log(`Fixed quotes in ${fixedCount} files`);
}

fixQuotes().catch(console.error);
