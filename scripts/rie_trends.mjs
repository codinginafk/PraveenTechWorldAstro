import googleTrends from 'google-trends-api';
import { getDb } from './scoutdb.mjs';

// Extract the strongest keyword from a title using basic NLP heuristics
function extractKeyword(title) {
    // Strip common stop words and extract core noun phrase
    const stopWords = new Set(['a','an','the','is','in','of','to','for','and','or','at',
        'by','on','with','as','from','this','that','are','was','were','been','has','have',
        'will','be','its','how','why','what','when','where','which','these','those']);
    const words = title.replace(/[^a-zA-Z0-9 ]/g, '').split(' ')
        .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
    // Return the first 3 meaningful words as the keyword
    return words.slice(0, 3).join(' ').trim();
}

async function fetchTrendsForTopics() {
    const db = await getDb();

    // Only fetch trends for pending topics not yet enriched
    const rawTopics = await db.all(`
        SELECT id, title, coverage_score
        FROM topics
        WHERE status = 'pending'
        LIMIT 20
    `);

    console.log(`[Scout] Enriching ${rawTopics.length} topics with Google Trends...`);

    for (const topic of rawTopics) {
        const keyword = extractKeyword(topic.title);
        if (!keyword) {
            console.log(`[Scout] Skipping "${topic.title}" — no keyword extracted.`);
            continue;
        }

        try {
            await new Promise(r => setTimeout(r, 1200)); // Respect rate limits
            const results = await googleTrends.interestOverTime({ keyword });
            const data = JSON.parse(results);

            let velocity = 0;
            let acceleration = 0;

            if (data?.default?.timelineData?.length > 1) {
                const timeline = data.default.timelineData;
                const last = timeline[timeline.length - 1].value[0];
                const prev = timeline[timeline.length - 2].value[0];
                velocity     = last;
                acceleration = last - prev;  // Positive = accelerating, Negative = dying
            }

            // Write velocity AND acceleration back to DB (was completely missing before)
            // Using coverage_score field to store trend velocity for now
            await db.run(
                `UPDATE topics SET coverage_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [velocity, topic.id]
            );

            // Store in search_metrics for the Learning Engine later
            await db.run(
                `INSERT INTO search_metrics (query, source_domain, results_found, useful_results)
                 VALUES (?, 'google.com/trends', 1, ?)`,
                [keyword, velocity > 40 ? 1 : 0]
            );

            const arrow = acceleration > 0 ? '📈' : acceleration < 0 ? '📉' : '➡️';
            console.log(`[Scout] "${keyword}" → Velocity: ${velocity} | Acceleration: ${acceleration} ${arrow}`);

        } catch (err) {
            console.error(`[Scout] Trends error for "${keyword}":`, err.message);
        }
    }

    console.log('[Scout] Trend enrichment complete. Velocity written to DB.');
}

if (process.argv[1] === import.meta.url || process.argv[1].endsWith('rie_trends.mjs')) {
    fetchTrendsForTopics().catch(console.error);
}

export { fetchTrendsForTopics };
