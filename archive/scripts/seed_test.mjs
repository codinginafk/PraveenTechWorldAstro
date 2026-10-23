import { getDb } from './scoutdb.mjs';

async function seed() {
    const db = await getDb();
    const topics = [
        ['test_1', 'Docker Desktop licensing changes', 'pending'],
        ['test_2', 'OpenAI Responses API', 'pending'],
        ['test_3', 'Claude Code Memory', 'pending'],
        ['test_4', 'Model Context Protocol (MCP) in Enterprise', 'pending'],
        ['test_5', 'DeepSeek Orchestration Logs', 'pending']
    ];
    
    const evidence = [
        ['ev_1', 'test_1', 'github.com', 'https://github.com', 'Docker Desktop licensing changes', 'Docker is changing licensing for large enterprises.', 97],
        ['ev_2', 'test_2', 'learn.microsoft.com', 'https://docs', 'OpenAI Responses API Migration', 'How to migrate to the new Responses API.', 100],
        ['ev_3', 'test_3', 'news.ycombinator.com', 'https://news', 'Claude Code Memory released', 'Users discuss the new Claude memory limits.', 84],
        ['ev_4', 'test_4', 'reddit.com', 'https://reddit', 'MCP breaking internal tools', 'We rolled out MCP to 700 users and it broke.', 74],
        ['ev_5', 'test_5', 'local_logs', 'local://', 'DeepSeek Orchestration Logs', 'I let DeepSeek run unsupervised in my cloud account for 30 days.', 100]
    ];

    for (const t of topics) {
        await db.run(`INSERT OR IGNORE INTO topics (id, title, status) VALUES (?, ?, ?)`, t);
    }
    
    // Insert a dummy source for local logs
    await db.run(`INSERT OR IGNORE INTO sources (domain, type, base_weight) VALUES ('local_logs', 'internal', 100)`);
    
    for (const e of evidence) {
        await db.run(`INSERT OR IGNORE INTO evidence (id, topic_id, source_domain, url, title, summary, weight) VALUES (?, ?, ?, ?, ?, ?, ?)`, e);
    }
    console.log("Seeded 5 test topics.");
}

seed().catch(console.error);
