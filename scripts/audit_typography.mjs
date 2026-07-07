import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');

async function fixTypography() {
    const files = await fs.readdir(ARTICLES_DIR);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));
    let modifiedCount = 0;

    for (const file of mdxFiles) {
        const filePath = path.join(ARTICLES_DIR, file);
        let content = await fs.readFile(filePath, 'utf-8');
        const originalContent = content;

        // Replace em-dash (—), en-dash (–), and minus sign (−) with a standard hyphen (-)
        // Also look out for Mojibake like â€” (which is UTF-8 em-dash decoded as Windows-1252)
        // Some AI generated text has things like " - " which the user prefers.
        
        // 1. Replace em dash
        content = content.replace(/—/g, '-');
        
        // 2. Replace en dash
        content = content.replace(/–/g, '-');

        // 3. Replace mathematical minus used as a dash
        content = content.replace(/−/g, '-');
        
        // 4. Replace common Mojibake for em-dash (â€")
        content = content.replace(/â€”/g, '-');
        content = content.replace(/â€“/g, '-');
        
        // Ensure no weird "?-" or "-?" left over from previous passes, unless they are valid.
        // We did a lot of cleanups on `?"` already.

        // Fix spaces around double hyphens generated previously as --
        // Wait, the user said "remove them and use a hyphen - because humans use this when writing"
        // Sometimes text has "word--word". Let's convert "--" to " - " or just "-" ? 
        // A single hyphen between words without spaces (word-word) is a compound word.
        // A dash between clauses is usually " word - word ".
        // Let's replace "--" with " - ".
        // Wait! We can't do this globally because `---` is used for YAML frontmatter!
        
        // So, let's only replace `--` if it is not part of `---`.
        // Look for exactly two hyphens not preceded or followed by another hyphen.
        content = content.replace(/(?<!-)--(?!-)/g, ' - ');
        
        if (content !== originalContent) {
            await fs.writeFile(filePath, content, 'utf-8');
            modifiedCount++;
        }
    }

    console.log(`Typography fixing complete. Modified ${modifiedCount} files.`);
}

fixTypography().catch(console.error);
