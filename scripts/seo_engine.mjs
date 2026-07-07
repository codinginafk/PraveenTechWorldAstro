/**
 * seo_engine.mjs
 * ============================================================
 * The SEO Division — Everything that directly drives clicks.
 * 
 * Components:
 *   1. Title Optimizer — generates 5 title variants, picks the best
 *   2. Meta Description Generator — 155-char hooks
 *   3. Schema Markup Injector — FAQ/HowTo/Article structured data
 *   4. Striking Distance Finder — finds pages ranking #8-30 to refresh
 *   5. Search Intent Validator — checks if people actually search this
 * ============================================================
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './scoutdb.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');

// ─── Shared LLM caller ────────────────────────────────────────────────────────

async function callLLM(systemPrompt, userContent, model = 'openai/gpt-4o-mini') {
    const dotenv = await import('dotenv');
    dotenv.config();
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new Error('LLM_API_KEY missing');

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userContent }
            ]
        })
    });

    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content.trim();
}

async function callLLMJson(systemPrompt, userContent) {
    let raw = await callLLM(systemPrompt, userContent);
    if (raw.startsWith('```json')) raw = raw.replace(/^```json\n/, '').replace(/\n```$/, '');
    if (raw.startsWith('```'))     raw = raw.replace(/^```\n/, '').replace(/\n```$/, '');
    return JSON.parse(raw);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. TITLE OPTIMIZER
// ═══════════════════════════════════════════════════════════════════════════════

export async function optimizeTitle(currentTitle, articleContent = '') {
    console.log(`[SEO/Title] Optimizing: "${currentTitle}"`);

    const result = await callLLMJson(
        `You are an elite SEO Title Optimizer for a technical IT blog.
Your titles consistently achieve 8-12% CTR in Google search results.

RULES:
- Generate exactly 5 title variants
- Every title MUST include the current year (2026)
- Every title MUST be 50-65 characters (Google truncates at ~60)
- Use power words: "Actually", "Real", "Complete", "Fix", "Why", "How"
- Include specificity: version numbers, user counts, concrete outcomes
- Front-load the primary keyword in the first 3 words when possible
- NO clickbait. The title must accurately represent the content.
- Prefer titles that answer an implicit question ("How to...", "Why...", "Fix...")

Return JSON:
{
  "variants": [
    {"title": "...", "rationale": "...", "estimated_ctr_boost": "2x"},
    ...
  ],
  "recommended": 0,
  "primary_keyword": "docker desktop licensing"
}`,
        `Current title: "${currentTitle}"\n\nArticle content (first 800 chars):\n${articleContent.slice(0, 800)}`
    );

    console.log(`[SEO/Title] Generated ${result.variants.length} variants:`);
    result.variants.forEach((v, i) => {
        const marker = i === result.recommended ? '★' : ' ';
        console.log(`  ${marker} ${i + 1}. "${v.title}" (${v.estimated_ctr_boost})`);
    });

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. META DESCRIPTION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateMetaDescription(title, articleContent = '') {
    console.log(`[SEO/Meta] Generating meta description for: "${title}"`);

    const result = await callLLMJson(
        `You are a meta description specialist. Generate 3 meta description variants.

RULES:
- Exactly 145-155 characters each (Google truncates at 155)
- Start with a verb or number for urgency
- Include one concrete detail from the article (a number, version, or outcome)
- End with a subtle CTA or curiosity gap
- NO generic filler ("In this article we will discuss...")
- The description must make a searcher NEED to click

Return JSON:
{
  "variants": [
    {"description": "...", "char_count": 152},
    {"description": "...", "char_count": 148},
    {"description": "...", "char_count": 155}
  ],
  "recommended": 0
}`,
        `Title: "${title}"\n\nArticle content (first 1000 chars):\n${articleContent.slice(0, 1000)}`
    );

    console.log(`[SEO/Meta] Best: "${result.variants[result.recommended].description}"`);
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SCHEMA MARKUP INJECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateSchemaMarkup(title, articleContent, pubDate) {
    console.log(`[SEO/Schema] Generating structured data for: "${title}"`);

    const result = await callLLMJson(
        `You are a structured data specialist. Based on the article, generate JSON-LD schema markup.

Generate ALL applicable schemas:
1. Article schema (always)
2. FAQPage schema (if the article answers distinct questions)
3. HowTo schema (if the article contains step-by-step instructions)

For FAQ schema: Extract 3-5 real questions the article answers.
For HowTo schema: Extract the actual steps with descriptions.

Return JSON:
{
  "schemas": [
    {
      "type": "Article",
      "json_ld": { ... }
    },
    {
      "type": "FAQPage",
      "json_ld": { ... }
    }
  ]
}

Use these values:
- author.name: "Praveen"
- publisher.name: "PraveenTechWorld"  
- publisher.url: "https://www.praveentechworld.com"
- datePublished: "${pubDate || new Date().toISOString().split('T')[0]}"`,
        `Title: "${title}"\n\nFull article:\n${articleContent.slice(0, 3000)}`
    );

    console.log(`[SEO/Schema] Generated ${result.schemas.length} schema(s): ${result.schemas.map(s => s.type).join(', ')}`);
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. SEARCH INTENT VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function validateSearchIntent(topic) {
    console.log(`[SEO/Intent] Validating search intent for: "${topic}"`);

    const result = await callLLMJson(
        `You are a search intent analyst. Evaluate whether this topic has genuine search demand.

For the given topic, estimate:
1. Monthly search volume tier: "high" (10k+), "medium" (1k-10k), "low" (100-1k), "tiny" (<100)
2. Intent type: "informational", "commercial", "navigational", "transactional"
3. Competition level: "high", "medium", "low"
4. 5 actual search queries people would type to find this content
5. "People Also Ask" questions Google would show
6. Whether this topic has enough depth for a 2000+ word article

Return JSON:
{
  "volume_tier": "medium",
  "intent_type": "informational",
  "competition": "medium",
  "search_queries": ["query1", "query2", "query3", "query4", "query5"],
  "people_also_ask": ["question1?", "question2?", "question3?"],
  "depth_sufficient": true,
  "verdict": "WRITE" | "SKIP" | "COMBINE_WITH_EXISTING",
  "reasoning": "..."
}`,
        `Topic: "${topic}"`
    );

    const emoji = result.verdict === 'WRITE' ? '🟢' : result.verdict === 'SKIP' ? '🔴' : '🟡';
    console.log(`[SEO/Intent] ${emoji} ${result.verdict} | Volume: ${result.volume_tier} | Competition: ${result.competition}`);
    console.log(`[SEO/Intent] Top queries: ${result.search_queries.slice(0, 3).join(', ')}`);
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. BATCH: Optimize ALL existing articles
// ═══════════════════════════════════════════════════════════════════════════════

export async function auditExistingArticles(dryRun = true) {
    console.log(`[SEO/Audit] Scanning all articles in ${ARTICLES_DIR}...`);
    
    const files = await fs.readdir(ARTICLES_DIR);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));
    console.log(`[SEO/Audit] Found ${mdxFiles.length} articles to audit.`);

    const results = [];

    for (const file of mdxFiles) {
        const filePath = path.join(ARTICLES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Extract frontmatter
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!fmMatch) continue;

        const fm = fmMatch[1];
        const titleMatch  = fm.match(/title:\s*["']?(.+?)["']?\s*$/m);
        const descMatch   = fm.match(/description:\s*["']?(.+?)["']?\s*$/m);
        
        const title = titleMatch?.[1] || file;
        const desc  = descMatch?.[1] || '';

        const issues = [];
        
        // Check title quality
        if (title.length < 30) issues.push('Title too short (<30 chars)');
        if (title.length > 65) issues.push('Title too long (>65 chars, will truncate)');
        if (!/\d{4}/.test(title)) issues.push('No year in title');
        
        // Check meta description
        if (!desc || desc === '' || desc.includes('TODO')) issues.push('Missing meta description');
        else if (desc.length < 100) issues.push(`Meta description too short (${desc.length} chars)`);
        else if (desc.length > 160) issues.push(`Meta description too long (${desc.length} chars)`);

        // Check for schema markup
        if (!content.includes('application/ld+json')) issues.push('No schema markup (no rich snippets)');

        // Check for internal links
        const internalLinkCount = (content.match(/\[.*?\]\(\/.*?\)/g) || []).length;
        if (internalLinkCount < 2) issues.push(`Only ${internalLinkCount} internal links (need 3+)`);

        // Check for images/diagrams
        const imageCount = (content.match(/!\[.*?\]/g) || []).length;
        if (imageCount === 0) issues.push('No images or diagrams');

        if (issues.length > 0) {
            results.push({ file, title, issues });
        }
    }

    // Generate report
    console.log(`\n[SEO/Audit] ══════ AUDIT RESULTS ══════`);
    console.log(`Total articles: ${mdxFiles.length}`);
    console.log(`Articles with issues: ${results.length}`);
    console.log(`Clean articles: ${mdxFiles.length - results.length}\n`);

    const issueCount = {};
    for (const r of results) {
        for (const issue of r.issues) {
            issueCount[issue] = (issueCount[issue] || 0) + 1;
        }
        console.log(`📄 ${r.file}`);
        r.issues.forEach(i => console.log(`   ⚠️  ${i}`));
    }

    console.log(`\n[SEO/Audit] ══════ TOP ISSUES ══════`);
    Object.entries(issueCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([issue, count]) => {
            console.log(`   ${count}x — ${issue}`);
        });

    return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

if (process.argv[1]?.endsWith('seo_engine.mjs')) {
    const [,, action, ...args] = process.argv;

    (async () => {
        switch (action) {
            case 'title':
                await optimizeTitle(args.join(' '));
                break;
            case 'meta':
                await generateMetaDescription(args.join(' '));
                break;
            case 'intent':
                await validateSearchIntent(args.join(' '));
                break;
            case 'audit':
                await auditExistingArticles();
                break;
            default:
                console.log('Usage:');
                console.log('  node scripts/seo_engine.mjs title "Your Article Title"');
                console.log('  node scripts/seo_engine.mjs meta "Your Article Title"');
                console.log('  node scripts/seo_engine.mjs intent "topic to validate"');
                console.log('  node scripts/seo_engine.mjs audit');
        }
    })().catch(console.error);
}
