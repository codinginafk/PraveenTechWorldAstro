import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');
const KEYWORDS_FILE = path.resolve(__dirname, 'internal_link_keywords.json');

// --- Phase 2: Inject Links ---
// We skip Phase 1 (LLM) here for speed/cost. Instead, we use a heuristic based on the slug.
// Wait, actually, let's just use the LLM if the KEYWORDS_FILE doesn't exist!

async function getLlmKeywords(articles) {
    console.log("Generating keyword dictionary via OpenRouter...");
    const dotenv = await import('dotenv');
    dotenv.config();

    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new Error("LLM_API_KEY is not set in .env");

const prompt = `
You are an SEO expert. I have a list of blog articles with their slugs and titles.
For each article, provide 3 SHORT (1 to 3 words max) highly relevant keywords or entity names that represent the core topic.
These keywords will be used for exact string matching to inject internal links across the blog.
They MUST be very common noun phrases that would naturally appear in other articles.
DO NOT use long phrases. Keep it to 1, 2, or 3 words maximum.
Examples:
- slug: "android-battery-draining-fast", phrases: ["battery drain", "Android battery", "phone battery"]
- slug: "what-is-domain-authority", phrases: ["domain authority", "DA score", "SEO authority"]
- slug: "core-web-vitals-fail", phrases: ["Core Web Vitals", "LCP", "website speed"]

Return ONLY valid JSON in this exact format, with no markdown formatting:
{
  "article-slug-here": ["phrase 1", "phrase 2", "phrase 3"]
}

Here are the articles:
${JSON.stringify(articles, null, 2)}
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "openai/gpt-4o-mini", // fast and cheap
            messages: [{ role: "user", content: prompt }]
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(JSON.stringify(data.error));
    
    let content = data.choices[0].message.content.trim();
    // Strip markdown formatting if the LLM adds it
    if (content.startsWith('```json')) {
        content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
    }
    if (content.startsWith('```')) {
        content = content.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return JSON.parse(content);
}

async function runLinker() {
    const files = await fs.readdir(ARTICLES_DIR);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));

    let articlesData = [];
    let fileContents = {};

    for (const file of mdxFiles) {
        const filePath = path.join(ARTICLES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const slug = file.replace('.mdx', '');
        
        // Extract title
        const titleMatch = content.match(/^title:\s*"(.*?)"/m);
        const title = titleMatch ? titleMatch[1] : slug;

        articlesData.push({ slug, title });
        fileContents[slug] = { path: filePath, content, originalContent: content };
    }

    let keywordMap = {};
    try {
        const keywordData = await fs.readFile(KEYWORDS_FILE, 'utf-8');
        keywordMap = JSON.parse(keywordData);
        console.log("Loaded keywords from internal_link_keywords.json");
    } catch (err) {
        // Generate via LLM
        // Split into chunks if needed, but 71 articles is small enough for one GPT-4o-mini call
        keywordMap = await getLlmKeywords(articlesData);
        await fs.writeFile(KEYWORDS_FILE, JSON.stringify(keywordMap, null, 2), 'utf-8');
        console.log("Generated and saved keywords to internal_link_keywords.json");
    }

    // Sort keywords by length descending to match longest phrases first (e.g., "android battery drain" before "battery drain")
    let allKeywords = [];
    for (const [slug, phrases] of Object.entries(keywordMap)) {
        for (const phrase of phrases) {
            if (phrase.trim().length > 4) { // Ignore very short phrases
                allKeywords.push({ phrase: phrase.toLowerCase(), slug });
            }
        }
    }
    allKeywords.sort((a, b) => b.phrase.length - a.phrase.length);

    // Now inject links
    let totalInjected = 0;

    for (const [slug, fileData] of Object.entries(fileContents)) {
        let content = fileData.content;
        let linksAdded = 0;
        const maxLinks = 3; // Maximum internal links per article
        
        // Separate frontmatter from body to avoid injecting into frontmatter
        const frontmatterEnd = content.indexOf('---', 3);
        if (frontmatterEnd === -1) continue; // safety check
        const startIndex = frontmatterEnd + 3;
        
        let frontmatter = content.substring(0, startIndex);
        let body = content.substring(startIndex);

        // Keep track of linked slugs in this article to avoid duplicate links to the same article
        let linkedSlugs = new Set();

        for (const target of allKeywords) {
            if (linksAdded >= maxLinks) break;
            if (target.slug === slug) continue; // don't link to self
            if (linkedSlugs.has(target.slug)) continue; // only one link per target article

            const phrase = target.phrase;
            
            // Regex to find the phrase not inside existing markdown links, image tags, or code blocks.
            // This is complex. A simpler robust way in JS is to split the document by code blocks and links, 
            // process only the plain text parts, then reassemble.
            
            // Tokenizer approach
            const parts = [];
            // Regex matches: code blocks, inline code, markdown links, html tags
            const excludeRegex = /(```[\s\S]*?```|`[^`]+`|\[[^\]]+\]\([^)]+\)|<[^>]+>)/g;
            
            let lastIndex = 0;
            let match;
            let phraseInjected = false;
            
            while ((match = excludeRegex.exec(body)) !== null) {
                // process the text BEFORE the excluded block
                let textChunk = body.substring(lastIndex, match.index);
                
                if (!phraseInjected) {
                    // Search for phrase with word boundaries, case insensitive
                    const phraseRegex = new RegExp(`\\b(${phrase})\\b`, 'i');
                    if (phraseRegex.test(textChunk)) {
                        textChunk = textChunk.replace(phraseRegex, `[$1](/articles/${target.slug})`);
                        phraseInjected = true;
                    }
                }
                
                parts.push(textChunk);
                parts.push(match[0]); // the excluded block remains unchanged
                lastIndex = excludeRegex.lastIndex;
            }
            // Add remaining text
            let textChunk = body.substring(lastIndex);
            if (!phraseInjected) {
                const phraseRegex = new RegExp(`\\b(${phrase})\\b`, 'i');
                if (phraseRegex.test(textChunk)) {
                    textChunk = textChunk.replace(phraseRegex, `[$1](/articles/${target.slug})`);
                    phraseInjected = true;
                }
            }
            parts.push(textChunk);
            
            if (phraseInjected) {
                body = parts.join('');
                linksAdded++;
                linkedSlugs.add(target.slug);
                totalInjected++;
            }
        }

        if (linksAdded > 0) {
            fileData.content = frontmatter + body;
        }
    }

    // Write back files
    let modifiedFiles = 0;
    for (const [slug, fileData] of Object.entries(fileContents)) {
        if (fileData.content !== fileData.originalContent) {
            await fs.writeFile(fileData.path, fileData.content, 'utf-8');
            modifiedFiles++;
        }
    }

    console.log(`Internal linking complete! Modified ${modifiedFiles} files. Injected ${totalInjected} total links.`);
}

runLinker().catch(console.error);
