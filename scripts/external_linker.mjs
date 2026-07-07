import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');
const REFS_FILE = path.resolve(__dirname, 'external_references.json');

function checkUrl(urlStr) {
    return new Promise((resolve) => {
        try {
            const url = new URL(urlStr);
            const client = url.protocol === 'https:' ? https : http;
            
            const req = client.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
                // some sites block HEAD, we could use GET, but HEAD is faster
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    resolve({ ok: true });
                } else if (res.statusCode === 405 || res.statusCode === 403) {
                    // some sites block HEAD with 405 Method Not Allowed or 403 Forbidden. Assume OK for now
                    resolve({ ok: true }); 
                } else {
                    resolve({ ok: false });
                }
            });

            req.on('error', () => resolve({ ok: false }));
            req.on('timeout', () => { req.destroy(); resolve({ ok: false }); });
            req.end();
        } catch (err) {
            resolve({ ok: false });
        }
    });
}

async function getLlmReferences(articles) {
    console.log("Requesting external references from LLM...");
    const dotenv = await import('dotenv');
    dotenv.config();

    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new Error("LLM_API_KEY is not set in .env");

    const prompt = `
You are an SEO expert. I have a list of blog articles with their slugs and titles.
For each article, provide 1 or 2 high-quality, authoritative external reference URLs (e.g., from wikipedia.org, developers.google.com, microsoft.com, apple.com, mozilla.org, etc.) that support the topic.
These should be REAL, widely known, stable URLs that will not 404 (e.g. Wikipedia main topic pages, official documentation hubs).
Do not generate highly specific deep links that might not exist. Keep to high-level authoritative pages.

Return ONLY valid JSON in this exact format, with no markdown formatting:
{
  "article-slug-here": [
    { "title": "Google Search Central Documentation", "url": "https://developers.google.com/search" },
    { "title": "Wikipedia: Domain Authority", "url": "https://en.wikipedia.org/wiki/Domain_authority" }
  ]
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
            model: "openai/gpt-4o-mini",
            messages: [{ role: "user", content: prompt }]
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(JSON.stringify(data.error));
    
    let content = data.choices[0].message.content.trim();
    if (content.startsWith('```json')) content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
    if (content.startsWith('```')) content = content.replace(/^```\n/, '').replace(/\n```$/, '');

    return JSON.parse(content);
}

async function runExternalLinker() {
    const files = await fs.readdir(ARTICLES_DIR);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));

    let articlesData = [];
    let fileContents = {};

    for (const file of mdxFiles) {
        const filePath = path.join(ARTICLES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const slug = file.replace('.mdx', '');
        
        const titleMatch = content.match(/^title:\s*"(.*?)"/m);
        const title = titleMatch ? titleMatch[1] : slug;

        articlesData.push({ slug, title });
        fileContents[slug] = { path: filePath, content, originalContent: content };
    }

    let refMap = {};
    try {
        const refData = await fs.readFile(REFS_FILE, 'utf-8');
        refMap = JSON.parse(refData);
        console.log("Loaded references from external_references.json");
    } catch (err) {
        refMap = await getLlmReferences(articlesData);
        await fs.writeFile(REFS_FILE, JSON.stringify(refMap, null, 2), 'utf-8');
        console.log("Generated and saved references to external_references.json");
    }

    let appendedCount = 0;

    for (const [slug, refs] of Object.entries(refMap)) {
        if (!fileContents[slug]) continue;
        
        let content = fileContents[slug].content;
        
        // Check if References section already exists
        if (content.includes("## References & Further Reading") || content.includes("## External Links")) {
            continue; 
        }

        let validRefs = [];
        for (const ref of refs) {
            const check = await checkUrl(ref.url);
            if (check.ok) validRefs.push(ref);
        }

        if (validRefs.length > 0) {
            let refSection = `\n\n## References & Further Reading\n\n`;
            for (const ref of validRefs) {
                refSection += `- [${ref.title}](${ref.url})\n`;
            }
            fileContents[slug].content += refSection;
            appendedCount++;
        }
    }

    for (const [slug, fileData] of Object.entries(fileContents)) {
        if (fileData.content !== fileData.originalContent) {
            await fs.writeFile(fileData.path, fileData.content, 'utf-8');
        }
    }

    console.log(`External linking complete. Appended references to ${appendedCount} articles.`);
}

runExternalLinker().catch(console.error);
