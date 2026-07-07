import { getDb } from './scoutdb.mjs';
import RSSParser from 'rss-parser';

const SOURCES = {
    hn: 'https://hacker-news.firebaseio.com/v0/topstories.json',
    hn_item: 'https://hacker-news.firebaseio.com/v0/item/'
};

// RSS feeds — curated tech/IT/AI feeds, no API key needed
const RSS_FEEDS = [
    { url: 'https://hnrss.org/frontpage', domain: 'news.ycombinator.com', weight: 84 },
    { url: 'https://www.reddit.com/r/sysadmin/.rss', domain: 'reddit.com', weight: 74 },
    { url: 'https://www.reddit.com/r/LocalLLaMA/.rss', domain: 'reddit.com', weight: 74 },
    { url: 'https://feeds.feedburner.com/TheHackersNews', domain: 'thehackernews.com', weight: 62 },
    { url: 'https://www.techradar.com/rss', domain: 'techradar.com', weight: 58 }
];

// Injection phrases to strip before any text reaches the LLM
const INJECTION_PATTERNS = [
    /ignore previous instructions/ig,
    /disregard (all|your|the) (previous|prior|above)/ig,
    /you are now/ig,
    /act as (a|an)/ig,
    /execute (this|the following)/ig,
    /reveal (your|the) (prompt|system|instructions)/ig,
    /\[\[.*?\]\]/g,   // [[injected commands]]
    /<<.*?>>/g         // <<injected commands>>
];

function sanitizeText(text) {
    if (!text) return '';
    let clean = text
        .replace(/<[^>]*>?/gm, '')   // Strip all HTML tags
        .replace(/&[a-z]+;/gi, ' '); // Strip HTML entities
    for (const pattern of INJECTION_PATTERNS) {
        clean = clean.replace(pattern, '[REDACTED]');
    }
    return clean.trim();
}

// Generate a stable, unique evidence ID from a URL
function makeEvidenceId(url) {
    return 'ev_' + Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
}

// Create a topic if it doesn't exist; return its ID
async function ensureTopic(db, title) {
    const topicId = 'top_' + Buffer.from(title).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
    await db.run(
        `INSERT OR IGNORE INTO topics (id, title, status) VALUES (?, ?, 'pending')`,
        [topicId, title]
    );
    return topicId;
}

async function fetchHN(db) {
    console.log('[Scout] Fetching HackerNews...');
    try {
        const res = await fetch(SOURCES.hn);
        const topIds = await res.json();
        let count = 0;
        for (let i = 0; i < 15; i++) {
            const itemRes = await fetch(`${SOURCES.hn_item}${topIds[i]}.json`);
            const item = await itemRes.json();
            if (item && item.type === 'story' && item.url) {
                const title = sanitizeText(item.title);
                const topicId  = await ensureTopic(db, title);
                const evidenceId = makeEvidenceId(item.url);
                await db.run(
                    `INSERT OR IGNORE INTO evidence (id, topic_id, source_domain, url, title, summary, weight)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [evidenceId, topicId, 'news.ycombinator.com',
                     item.url, title, title, 84]
                );
                count++;
            }
        }
        console.log(`[Scout] Saved ${count} HackerNews stories.`);
    } catch (e) {
        console.error('[Scout] HN Fetch Error:', e.message);
    }
}

async function fetchRSSFeeds(db) {
    const parser = new RSSParser();
    for (const feed of RSS_FEEDS) {
        console.log(`[Scout] Fetching RSS: ${feed.url}...`);
        try {
            const parsed = await parser.parseURL(feed.url);
            let count = 0;
            for (const item of (parsed.items || []).slice(0, 10)) {
                const title = sanitizeText(item.title || '');
                const summary = sanitizeText(item.contentSnippet || item.summary || '');
                const url = item.link || item.guid || '';
                if (!url || !title) continue;
                const topicId   = await ensureTopic(db, title);
                const evidenceId = makeEvidenceId(url);
                await db.run(
                    `INSERT OR IGNORE INTO evidence (id, topic_id, source_domain, url, title, summary, weight)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [evidenceId, topicId, feed.domain, url, title, summary.slice(0, 500), feed.weight]
                );
                count++;
            }
            console.log(`[Scout] Saved ${count} items from ${feed.domain}.`);
        } catch (e) {
            console.error(`[Scout] RSS Error (${feed.url}):`, e.message);
        }
    }
}

async function fetchReddit(db, subreddit, domain) {
    console.log(`Fetching Reddit: r/${subreddit}...`);
    
    // Check for middleman API keys in the environment
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const apifyToken = process.env.APIFY_TOKEN;
    
    try {
        let posts = [];
        
        // 1. Try RapidAPI Reddit Scraper (High free limit)
        if (rapidApiKey) {
            console.log("Using RapidAPI Reddit Scraper...");
            const res = await fetch(`https://reddit3.p.rapidapi.com/subreddit?url=https://www.reddit.com/r/${subreddit}/hot`, {
                headers: {
                    'x-rapidapi-key': rapidApiKey,
                    'x-rapidapi-host': 'reddit3.p.rapidapi.com'
                }
            });
            const data = await res.json();
            if (data.posts) {
                posts = data.posts.map(p => ({
                    id: p.id,
                    permalink: p.href,
                    title: p.title,
                    selftext: p.text || ''
                }));
            }
        } 
        // 2. Try Apify Reddit Scraper
        else if (apifyToken) {
            console.log("Using Apify Reddit Scraper...");
            // Apify requires starting an actor and fetching the dataset, simplified here for structure
            const res = await fetch(`https://api.apify.com/v2/acts/trudax~reddit-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startUrls: [{ url: `https://www.reddit.com/r/${subreddit}/hot` }], maxItems: 10 })
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                posts = data.map(p => ({
                    id: p.id,
                    permalink: p.url,
                    title: p.title,
                    selftext: p.text || ''
                }));
            }
        } 
        // 3. Fallback to native (which usually gets blocked)
        else {
            console.log("No middleman APIs found. Falling back to native Reddit JSON (Warning: High block rate)...");
            const res = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=10`, {
                headers: { 'User-Agent': 'ResearchIntelligenceEngine/1.0' }
            });
            const data = await res.json();
            if (data && data.data && data.data.children) {
                posts = data.data.children.map(c => c.data);
            }
        }
        
        let count = 0;
        for (const post of posts) {
            const title = sanitizeText(post.title);
            const summary = sanitizeText(post.selftext).substring(0, 500);
            const url = post.permalink?.startsWith('http') ? post.permalink : `https://reddit.com${post.permalink || ''}`;
            if (!title || !url) continue;
            const topicId    = await ensureTopic(db, title);
            const evidenceId = makeEvidenceId(url);

            await db.run(
                `INSERT OR IGNORE INTO evidence (id, topic_id, source_domain, url, title, summary, weight)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [evidenceId, topicId, domain, url, title, summary, 74]
            );
            count++;
        }
        
        console.log(`[Scout] Saved ${count} Reddit posts from r/${subreddit}.`);
    } catch (e) {
        console.error("Reddit Fetch Error:", e.message);
    }
}

export async function runIngestion() {
    const db = await getDb();
    const dotenv = await import('dotenv');
    dotenv.config();

    await fetchHN(db);
    await fetchRSSFeeds(db);
    await fetchReddit(db, 'sysadmin', 'reddit.com');
    await fetchReddit(db, 'LocalLLaMA', 'reddit.com');
    console.log('[Scout] Ingestion Complete.');
}

if (process.argv[1] === import.meta.url || process.argv[1].endsWith('rie_ingestion.mjs')) {
    runIngestion().catch(console.error);
}
