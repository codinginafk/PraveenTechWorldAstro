import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');

async function extractCodeBlocks() {
    const files = await fs.readdir(ARTICLES_DIR);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));
    
    let allCodeBlocks = [];
    let blockId = 0;

    for (const file of mdxFiles) {
        const filePath = path.join(ARTICLES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Regex to find ```language\n code \n```
        const regex = /```(\w+)\n([\s\S]*?)```/g;
        let match;
        
        while ((match = regex.exec(content)) !== null) {
            const language = match[1].toLowerCase();
            const code = match[2].trim();
            
            // Skip empty blocks or very short single-line commands unless it's python/js
            if (code.length < 5) continue;
            
            allCodeBlocks.push({
                id: `block-${++blockId}`,
                file: file,
                language: language,
                code: code
            });
        }
    }

    const outputPath = path.resolve(__dirname, 'extracted_code_blocks.json');
    await fs.writeFile(outputPath, JSON.stringify(allCodeBlocks, null, 2));
    
    console.log(`Extracted ${allCodeBlocks.length} code blocks into extracted_code_blocks.json.`);
    
    // Print a quick summary of languages found
    const langs = {};
    allCodeBlocks.forEach(b => {
        langs[b.language] = (langs[b.language] || 0) + 1;
    });
    console.log("Languages found:", langs);
}

extractCodeBlocks().catch(console.error);
