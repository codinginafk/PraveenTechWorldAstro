/**
 * seo_batch_fixer.mjs
 * ============================================================
 * Retrofits all existing 71 articles with optimized SEO data:
 * 1. Generates 2026-optimized titles
 * 2. Generates 155-char meta descriptions
 * 3. Injects Article and FAQ schema markup
 * ============================================================
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { optimizeTitle, generateMetaDescription, generateSchemaMarkup } from './seo_engine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');

// Utility to sleep
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runBatchFix() {
    console.log(`[SEO/Batch] Scanning ${ARTICLES_DIR}...`);
    
    const files = await fs.readdir(ARTICLES_DIR);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));
    console.log(`[SEO/Batch] Found ${mdxFiles.length} files. Starting optimization...\n`);

    let count = 0;

    for (const file of mdxFiles) {
        const filePath = path.join(ARTICLES_DIR, file);
        let content = await fs.readFile(filePath, 'utf-8');
        
        // Skip if it already has schema markup to avoid double-processing
        if (content.includes('application/ld+json')) {
            console.log(`[SEO/Batch] ⏭️  Skipping ${file} (Already has schema markup)`);
            continue;
        }

        console.log(`\n==========================================`);
        console.log(`[SEO/Batch] Processing: ${file}`);
        console.log(`==========================================`);

        // Extract current frontmatter
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!fmMatch) {
            console.log(`[SEO/Batch] ⚠️  No frontmatter found in ${file}. Skipping.`);
            continue;
        }

        const fm = fmMatch[1];
        const titleMatch  = fm.match(/title:\s*["']?(.+?)["']?\s*$/m);
        const currentTitle = titleMatch?.[1] || file.replace('.mdx', '');
        
        const dateMatch = fm.match(/pubDate:\s*["']?(.+?)["']?\s*$/m);
        const pubDate = dateMatch?.[1] || new Date().toISOString().split('T')[0];

        try {
            // 1. Optimize Title
            const titleRes = await optimizeTitle(currentTitle, content);
            const newTitle = titleRes.variants[titleRes.recommended].title;
            await sleep(1000); // rate limit protection

            // 2. Generate Meta Description
            const metaRes = await generateMetaDescription(newTitle, content);
            const newDesc = metaRes.variants[metaRes.recommended].description;
            await sleep(1000); // rate limit protection

            // 3. Generate Schema Markup
            const schemaRes = await generateSchemaMarkup(newTitle, content, pubDate);
            await sleep(1000); // rate limit protection

            // --- Apply Changes ---
            
            // Replace Title
            content = content.replace(
                /title:\s*["']?(.+?)["']?\s*$/m,
                `title: "${newTitle.replace(/"/g, '\\"')}"`
            );

            // Replace or Add Description
            if (content.match(/description:\s*["']?(.+?)["']?\s*$/m)) {
                content = content.replace(
                    /description:\s*["']?(.+?)["']?\s*$/m,
                    `description: "${newDesc.replace(/"/g, '\\"')}"`
                );
            } else {
                content = content.replace(/^---\n/, `---\ndescription: "${newDesc.replace(/"/g, '\\"')}"\n`);
            }

            // Append Schema Markup
            if (schemaRes?.schemas && schemaRes.schemas.length > 0) {
                content += `\n\n<script type="application/ld+json">\n`;
                // Add all generated schemas inside an array
                const jsonLdArray = schemaRes.schemas.map(s => s.json_ld);
                content += JSON.stringify(jsonLdArray, null, 2);
                content += `\n</script>\n`;
            }

            // Write back to file
            await fs.writeFile(filePath, content, 'utf-8');
            console.log(`[SEO/Batch] ✅ Successfully optimized ${file}`);
            count++;

        } catch (e) {
            console.error(`[SEO/Batch] ❌ Failed to process ${file}:`, e.message);
        }
    }

    console.log(`\n[SEO/Batch] 🎉 Complete! Optimized ${count} articles.`);
}

runBatchFix().catch(console.error);
