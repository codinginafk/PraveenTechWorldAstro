import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');
const API_KEY = process.env.LLM_API_KEY;
const MODEL = process.env.LLM_MODEL && !process.env.LLM_MODEL.includes('laguna') ? process.env.LLM_MODEL : 'openai/gpt-4o-mini';

if (!API_KEY) {
    console.error("ERROR: LLM_API_KEY not found in .env");
    process.exit(1);
}

const SYSTEM_PROMPT = `You are the PraveenTechWorld Assistant, a Tech Blog Writer & Curious Explorer.

STRICT PERSONA (soul.md):
- role: Tech Blog Writer & Curious Explorer
- safeguards:
  - fact_check_required: true
  - source_verification: true
  - hallucination_prevention: "flag uncertain claims with 'I might be wrong...'"
  - brand_voice: "conversational, open-discussion, friendly"
  - banned_topics: ["medical_advice", "legal_advice", "misinformation"]
- quality_checks:
  - seo_optimized: true
  - code_tested: true
  - links_verified: true
  - sources_cited: true
  - tone_check: "friendly_not_corporate"
- content_structure:
  - hook: "Relatable problem"
  - context: "Here is what I found"
  - solution: "Step-by-step breakdown"
  - limitations: "This won't work if..."
  - cta: "What is your take?"

YOUR TASK:
Rewrite the provided Markdown article to strictly match the persona above. 
Your tone must be conversational, humble, and friendly. Do not use corporate jargon or fake confidence. 
Admit uncertainty where appropriate ("I'm not 100% sure, but..."). Ask the reader for their thoughts.

CRITICAL INSTRUCTIONS:
1. YOU MUST PRESERVE the exact YAML frontmatter (the content between the --- blocks at the very top of the file). Do NOT change the SEO title, tags, cover image, etc.
2. YOU MUST PRESERVE all existing internal links (e.g., [link text](/blog/slug)).
3. Rewrite the prose to fit the friendly, conversational structure.
4. Output ONLY the raw markdown of the fully rewritten file. Do not include markdown code blocks (e.g. \`\`\`markdown) wrapping your response. Start exactly with the --- of the frontmatter.`;

async function processFile(filePath, fileName) {
    console.log(`Processing: ${fileName}`);
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `Rewrite the following article:\n\n${content}` }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`API Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        let rewrittenContent = data.choices[0].message.content;
        
        // Clean up formatting if LLM wrapped in markdown blocks
        if (rewrittenContent.startsWith('```markdown')) {
            rewrittenContent = rewrittenContent.substring(11);
            if (rewrittenContent.endsWith('```')) {
                rewrittenContent = rewrittenContent.substring(0, rewrittenContent.length - 3);
            }
        }
        rewrittenContent = rewrittenContent.trim();

        await fs.writeFile(filePath, rewrittenContent, 'utf-8');
        console.log(`✅ Successfully rewritten: ${fileName}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to process ${fileName}:`, error.message);
        return false;
    }
}

async function main() {
    console.log("Starting Content Rewriter Orchestration...");
    console.log(`Using Model: ${MODEL}`);
    
    const files = await fs.readdir(ARTICLES_DIR);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));
    console.log(`Found ${mdxFiles.length} .mdx articles to process.\n`);

    const BATCH_SIZE = 3;
    let successCount = 0;
    
    for (let i = 0; i < mdxFiles.length; i += BATCH_SIZE) {
        const batch = mdxFiles.slice(i, i + BATCH_SIZE);
        console.log(`\n--- Processing Batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(mdxFiles.length/BATCH_SIZE)} ---`);
        
        const promises = batch.map(fileName => {
            const filePath = path.join(ARTICLES_DIR, fileName);
            return processFile(filePath, fileName);
        });
        
        const results = await Promise.all(promises);
        successCount += results.filter(r => r).length;
        
        if (i + BATCH_SIZE < mdxFiles.length) {
            console.log("Waiting 5 seconds before next batch to respect rate limits...");
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log(`\n🎉 Orchestration Complete! Successfully rewritten ${successCount}/${mdxFiles.length} articles.`);
}

main();
