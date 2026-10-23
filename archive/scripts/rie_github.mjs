/**
 * rie_github.mjs
 * ============================================================
 * GitHub Issues & Release Notes Worker
 * Searches GitHub for issues, discussions, and releases related
 * to topics in ScoutDB. No API key needed for public repos
 * at low rate (60 req/hr unauthenticated, 5000/hr with token).
 * ============================================================
 */

import { getDb } from './scoutdb.mjs';

const GITHUB_API = 'https://api.github.com';

// Pain keywords — the highest-ROI signals for blog content
const PAIN_KEYWORDS = [
    'error', 'bug', 'broken', "can't", 'issue', 'fails',
    'timeout', 'memory leak', 'slow', 'deprecated', 'migration',
    'not working', 'help', 'crash', 'failed', 'regression'
];

// Repos to monitor for release notes & changelog signals
const WATCHED_REPOS = [
    'docker/docker',
    'openai/openai-python',
    'anthropics/anthropic-sdk-python',
    'microsoft/vscode',
    'ollama/ollama',
    'BerriAI/litellm',
    'astro/astro'
];

async function githubFetch(path) {
    const dotenv = await import('dotenv');
    dotenv.config();
    const token = process.env.GITHUB_TOKEN;
    const headers = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'ResearchIntelligenceEngine/1.0'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${GITHUB_API}${path}`, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
    return res.json();
}

function sanitizeGithubText(text) {
    if (!text) return '';
    return text
        .replace(/```[\s\S]*?```/g, '[CODE_BLOCK]') // Don't feed raw code to LLM
        .replace(/<[^>]*>/g, '')
        .replace(/https?:\/\/\S+/g, '[URL]')        // Strip URLs (separate evidence)
        .slice(0, 600)
        .trim();
}

function scoreIssue(issue) {
    // Pain Detector: count pain keywords × engagement (comments)
    const text = `${issue.title} ${issue.body || ''}`.toLowerCase();
    const painHits = PAIN_KEYWORDS.filter(kw => text.includes(kw)).length;
    const engagement = issue.comments || 0;
    return painHits * Math.log1p(engagement + 1);  // Log to prevent one viral post dominating
}

function makeEvidenceId(url) {
    return 'ev_' + Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
}

async function ensureTopic(db, title) {
    const topicId = 'top_' + Buffer.from(title).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
    await db.run(
        `INSERT OR IGNORE INTO topics (id, title, status) VALUES (?, ?, 'pending')`,
        [topicId, title]
    );
    return topicId;
}

// Search GitHub Issues for a topic keyword
async function searchGithubIssues(db, keyword) {
    console.log(`[Scout/GitHub] Searching issues for: "${keyword}"...`);
    try {
        const q = encodeURIComponent(`${keyword} is:issue is:open sort:comments`);
        const data = await githubFetch(`/search/issues?q=${q}&per_page=10`);
        
        if (!data.items) return;

        for (const issue of data.items) {
            const painScore = scoreIssue(issue);
            if (painScore < 0.5) continue; // Skip low-signal issues

            const title    = `[GitHub Issue] ${issue.title}`;
            const summary  = sanitizeGithubText(issue.body);
            const topicId  = await ensureTopic(db, issue.title);
            const evId     = makeEvidenceId(issue.html_url);
            
            // GitHub Issues weight: 91 (from our source weighting matrix)
            const weight = Math.min(91, 70 + painScore * 5);

            await db.run(
                `INSERT OR IGNORE INTO evidence (id, topic_id, source_domain, url, title, summary, weight)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [evId, topicId, 'github.com', issue.html_url, title, summary, weight]
            );
        }
        console.log(`[Scout/GitHub] Processed ${data.items.length} issues for "${keyword}".`);
    } catch (e) {
        console.error(`[Scout/GitHub] Issue search error:`, e.message);
    }
}

// Fetch latest releases from watched repos
async function fetchWatchedReleases(db) {
    console.log('[Scout/GitHub] Checking watched repos for new releases...');
    for (const repo of WATCHED_REPOS) {
        try {
            await new Promise(r => setTimeout(r, 500)); // Rate limit guard
            const releases = await githubFetch(`/repos/${repo}/releases?per_page=3`);
            
            for (const release of releases) {
                if (!release.html_url) continue;
                const title   = `[Release] ${repo} ${release.tag_name}: ${release.name || ''}`;
                const summary = sanitizeGithubText(release.body);
                const topicId = await ensureTopic(db, title);
                const evId    = makeEvidenceId(release.html_url);

                // Release Notes weight: 93 (from source weighting matrix)
                await db.run(
                    `INSERT OR IGNORE INTO evidence (id, topic_id, source_domain, url, title, summary, weight)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [evId, topicId, 'github.com', release.html_url, title, summary, 93]
                );
            }
            console.log(`[Scout/GitHub] Fetched releases for ${repo}.`);
        } catch (e) {
            console.error(`[Scout/GitHub] Release error for ${repo}:`, e.message);
        }
    }
}

// Main entry: run for a given keyword, or scan all watched repos
export async function runGithubWorker(keywords = []) {
    const db = await getDb();
    const dotenv = await import('dotenv');
    dotenv.config();

    // Fetch releases from watched repos (always runs)
    await fetchWatchedReleases(db);

    // Search issues for each provided keyword
    for (const kw of keywords) {
        await new Promise(r => setTimeout(r, 800)); // Rate limit guard
        await searchGithubIssues(db, kw);
    }
    
    console.log('[Scout/GitHub] GitHub worker complete.');
}

if (process.argv[1] === import.meta.url || process.argv[1].endsWith('rie_github.mjs')) {
    const keywords = process.argv.slice(2).length > 0 
        ? process.argv.slice(2) 
        : ['docker desktop licensing', 'MCP protocol', 'openai responses api', 'claude memory'];
    runGithubWorker(keywords).catch(console.error);
}
