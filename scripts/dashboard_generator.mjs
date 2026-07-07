import { getDb } from './scoutdb.mjs';
import fs from 'fs/promises';
import path from 'path';

async function generateDashboard() {
    const db = await getDb();
    
    // Fetch evaluated topics that scored highly
    const evaluatedTopics = await db.all(`
        SELECT t.id, t.title, t.confidence_score, e.source_domain, e.summary
        FROM topics t
        LEFT JOIN evidence e ON t.id = e.topic_id
        WHERE t.status = 'evaluated' AND t.confidence_score >= 80
        ORDER BY t.confidence_score DESC
    `);

    // Fetch topics that are stuck in research loop
    const researchingTopics = await db.all(`
        SELECT id, title, confidence_score
        FROM topics
        WHERE status = 'researching'
    `);

    let md = `# Research Intelligence Engine: DRAFT QUEUE\n\n`;
    md += `*Generated automatically on: ${new Date().toISOString()}*\n\n`;
    md += `This dashboard pulls directly from the local \`ScoutDB\`. Topics listed here have passed the 12-point Evidence & Trend evaluation matrix and are ready for editorial drafting.\n\n`;

    md += `## 🟢 Approved for Drafting (Confidence > 80%)\n\n`;
    if (evaluatedTopics.length === 0) {
        md += `*No topics currently meet the minimum confidence threshold.* \n\n`;
    } else {
        // Group by ID to handle multiple evidence sources nicely
        const uniqueTopics = new Map();
        for (const t of evaluatedTopics) {
            if (!uniqueTopics.has(t.id)) {
                uniqueTopics.set(t.id, { ...t, sources: [t.source_domain] });
            } else {
                uniqueTopics.get(t.id).sources.push(t.source_domain);
            }
        }

        for (const [id, topic] of uniqueTopics) {
            md += `### [${topic.confidence_score}%] ${topic.title}\n`;
            md += `- **Primary Sources:** ${[...new Set(topic.sources)].join(', ')}\n`;
            md += `- **Context:** ${topic.summary ? topic.summary.substring(0, 150) + '...' : 'No summary available.'}\n`;
            md += `- **Action:** \`node scripts/content_scorer.mjs src/content/articles/${topic.id}.mdx\`\n\n`;
        }
    }

    md += `## 🟡 In Recursive Search Loop (Need More Evidence)\n\n`;
    if (researchingTopics.length === 0) {
        md += `*No topics currently stuck in the research loop.* \n`;
    } else {
        md += `The RIE Planner determined these topics lack sufficient evidence diversity or official documentation to warrant writing yet. The workers will continue searching for them on the next run.\n\n`;
        for (const topic of researchingTopics) {
            md += `- **[${topic.confidence_score}%]** ${topic.title}\n`;
        }
    }

    const outPath = path.resolve(process.cwd(), 'DRAFT_QUEUE.md');
    await fs.writeFile(outPath, md, 'utf-8');
    
    console.log(`[Dashboard] DRAFT_QUEUE.md successfully generated with ${evaluatedTopics.length} approved topics.`);
}

if (process.argv[1] === import.meta.url || process.argv[1].endsWith('dashboard_generator.mjs')) {
    generateDashboard().catch(console.error);
}
