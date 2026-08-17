import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, 'scoutdb.sqlite');

export function getDb() {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    return db;
}

export function initDb() {
    const db = getDb();
    
    // Topics: The core hypotheses or clustered subjects
    db.exec(`
        CREATE TABLE IF NOT EXISTS topics (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            confidence_score REAL DEFAULT 0,
            coverage_score REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Sources: The dynamic source reliability matrix
    db.exec(`
        CREATE TABLE IF NOT EXISTS sources (
            domain TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            base_weight REAL DEFAULT 50,
            reliability_score REAL DEFAULT 1.0,
            last_polled DATETIME
        );
    `);

    // Evidence: The raw artifacts linked to a topic (The Evidence Graph)
    db.exec(`
        CREATE TABLE IF NOT EXISTS evidence (
            id TEXT PRIMARY KEY,
            topic_id TEXT NOT NULL,
            source_domain TEXT NOT NULL,
            url TEXT NOT NULL,
            title TEXT,
            summary TEXT,
            extracted_entities TEXT,
            weight REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(topic_id) REFERENCES topics(id),
            FOREIGN KEY(source_domain) REFERENCES sources(domain)
        );
    `);

    // Search Metrics: Tracks performance of searches for Cost Awareness and Learning
    db.exec(`
        CREATE TABLE IF NOT EXISTS search_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT NOT NULL,
            source_domain TEXT NOT NULL,
            results_found INTEGER DEFAULT 0,
            useful_results INTEGER DEFAULT 0,
            cost_cents REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Seed some initial source weights based on RIE rules
    const seedSources = [
        { domain: 'learn.microsoft.com', type: 'official_docs', weight: 100 },
        { domain: 'github.com', type: 'github', weight: 97 },
        { domain: 'news.ycombinator.com', type: 'hn', weight: 84 },
        { domain: 'reddit.com', type: 'reddit', weight: 74 },
        { domain: 'freenewsapi.com', type: 'news', weight: 60 }
    ];

    const insertStmt = db.prepare(`INSERT OR IGNORE INTO sources (domain, type, base_weight) VALUES (?, ?, ?)`);
    const insertMany = db.transaction((sources) => {
        for (const source of sources) {
            insertStmt.run(source.domain, source.type, source.weight);
        }
    });

    insertMany(seedSources);

    console.log("ScoutDB initialized successfully (better-sqlite3).");
    return db;
}

// Allow running standalone to init
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        initDb();
    } catch (err) {
        console.error(err);
    }
}
