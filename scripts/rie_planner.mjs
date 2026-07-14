/**
 * rie_planner.mjs
 * ============================================================
 * Recursive Mission Planner — evaluates topic confidence via LLM.
 * 
 * Can operate in two modes:
 *   1. Standalone: evaluates all pending topics in the `topics` table.
 *   2. Artifact-aware: evaluates a specific artifact from Mission Control,
 *      syncing confidence back to the `artifacts` table.
 * ============================================================
 */

import { getDb } from './scoutdb.mjs';

function extractJSON(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        // Try regex extraction of JSON block
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch (e2) {
                // Ignore
            }
        }
        return null;
    }
}

async function callLLM(prompt) {
    const dotenv = await import('dotenv');
    dotenv.config();

    // Try local OmniRoute proxy first
    const OMNIROUTE_URL = "http://localhost:20128/v1/chat/completions";
    try {
        const omniRes = await fetch(OMNIROUTE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer omniroute-resilience-key"
            },
            body: JSON.stringify({
                model: "openrouter/free", // Route via free pool
                stream: false,
                messages: [{ role: "user", content: prompt }]
            }),
            signal: AbortSignal.timeout(15000)
        });

        if (omniRes.ok) {
            const data = await omniRes.json();
            let content = data.choices[0].message.content.trim();
            if (content.startsWith('```json')) content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
            if (content.startsWith('```'))     content = content.replace(/^```\n/, '').replace(/\n```$/, '');
            
            const parsed = extractJSON(content);
            if (parsed) return parsed;
            
            console.warn(`[Planner] OmniRoute response could not be parsed as JSON. Content: "${content}"`);
        }
    } catch (err) {
        console.warn(`[Planner] Local OmniRoute proxy call failed: ${err.message}. Falling back...`);
    }

    // Fall back to direct OpenRouter
    const apiKey = process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) { console.warn('[Planner] LLM_API_KEY missing.'); return null; }

    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.3-70b-instruct:free',
                messages: [{ role: 'user', content: prompt }]
            }),
            signal: AbortSignal.timeout(15000)
        });

        if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
        const data = await res.json();
        let content = data.choices[0].message.content.trim();
        if (content.startsWith('```json')) content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
        if (content.startsWith('```'))     content = content.replace(/^```\n/, '').replace(/\n```$/, '');
        return extractJSON(content);
    } catch (err) {
        console.error("[Planner] Direct OpenRouter fallback failed:", err.message);
        return null;
    }
}


function buildPrompt(title, evidenceSummary, sources) {
    return `
You are a Principal Research Intelligence Agent for an Enterprise IT Blog.
Your author has run enterprise infrastructure for 700+ users across 35+ branches using Python, SQL, Active Directory, and DeepSeek.

Evaluate the following topic hypothesis and its evidence.
Topic: ${title}
Evidence Summary: ${evidenceSummary}
Sources: ${sources}

Score this topic on a scale of 0-100 overall confidence based on these criteria:
1. Evidence Diversity (Does it have docs + github + reddit + official sources?)
2. Personal Expertise (Can an Enterprise IT Admin write about this uniquely?)
3. Competitive Intelligence (Can we beat generic SEO sites on this?)
4. Search Intent (Are real people likely searching for this topic right now?)

Return a strict JSON object:
{
  "confidence_score": 85,
  "analysis": "Brief reasoning",
  "missing_evidence": "What else do we need to search for?",
  "editorial_angle": "One unique angle to write about",
  "suggested_title": "A compelling, click-worthy title with year and specificity",
  "target_queries": ["query1", "query2", "query3"]
}
`;
}

// ─── Evaluate a specific artifact (called by Mission Control) ──────────────
export async function runPlanner(artifactId) {
    const db = await getDb();

    if (artifactId) {
        // Mission Control mode: evaluate a specific artifact
        const artifact = await db.get(`SELECT * FROM artifacts WHERE id = ?`, [artifactId]);
        if (!artifact) { console.error(`[Planner] Artifact not found: ${artifactId}`); return; }

        console.log(`[Planner] Evaluating artifact: "${artifact.title}"`);

        // Gather all evidence linked to topics matching this artifact title
        const evidence = await db.all(
            `SELECT e.title, e.summary, e.source_domain, e.weight
             FROM evidence e
             JOIN topics t ON e.topic_id = t.id
             WHERE t.title = ?
             ORDER BY e.weight DESC LIMIT 10`,
            [artifact.title]
        );

        const evidenceSummary = evidence.map(e => `[${e.source_domain}] ${e.title}: ${e.summary}`).join('\n');
        const sources = [...new Set(evidence.map(e => e.source_domain))].join(', ');

        const prompt = buildPrompt(artifact.title, evidenceSummary || 'No evidence gathered yet.', sources || 'none');
        const evaluation = await callLLM(prompt);

        if (!evaluation) return;

        console.log(`[Planner] Confidence: ${evaluation.confidence_score}% | Angle: ${evaluation.editorial_angle}`);

        // Sync confidence and editorial angle back to artifacts table
        await db.run(
            `UPDATE artifacts SET confidence = ?, editorial_angle = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [evaluation.confidence_score, evaluation.editorial_angle, artifactId]
        );

        // Also update the matching topic in topics table
        const topicStatus = evaluation.confidence_score >= 80 ? 'evaluated' : 'researching';
        await db.run(
            `UPDATE topics SET status = ?, confidence_score = ? WHERE title = ?`,
            [topicStatus, evaluation.confidence_score, artifact.title]
        );

        return evaluation;
    }

    // ─── Standalone mode: evaluate all pending topics ─────────────────────
    const rawTopics = await db.all(`
        SELECT t.id, t.title, 
               GROUP_CONCAT(e.summary, ' | ') as summaries,
               GROUP_CONCAT(DISTINCT e.source_domain) as sources,
               AVG(e.weight) as avg_weight
        FROM topics t
        JOIN evidence e ON t.id = e.topic_id
        WHERE t.status = 'pending'
        GROUP BY t.id
        LIMIT 20
    `);

    console.log(`[Planner] Evaluating ${rawTopics.length} pending topics...`);

    for (const topic of rawTopics) {
        console.log(`\n[Planner] Hypothesis: "${topic.title}" (sources: ${topic.sources})`);

        const prompt = buildPrompt(topic.title, topic.summaries?.slice(0, 800) || '', topic.sources || '');
        const evaluation = await callLLM(prompt);
        if (!evaluation) continue;

        console.log(`[Planner] → Confidence: ${evaluation.confidence_score}% | Angle: ${evaluation.editorial_angle}`);

        if (evaluation.confidence_score >= 80) {
            await db.run(`UPDATE topics SET status = 'evaluated', confidence_score = ? WHERE id = ?`,
                [evaluation.confidence_score, topic.id]);
        } else {
            await db.run(`UPDATE topics SET status = 'researching', confidence_score = ? WHERE id = ?`,
                [evaluation.confidence_score, topic.id]);
        }
    }
    console.log('[Planner] Evaluation complete.');
}

if (process.argv[1] === import.meta.url || process.argv[1].endsWith('rie_planner.mjs')) {
    runPlanner()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}
