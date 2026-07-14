#!/usr/bin/env node
/**
 * scripts/cluster_manager.mjs
 * ---------------------------------------------------------------------------
 * Turns "own one topic, then move to the next" from a vibe into three
 * concrete, checkable things:
 *
 *   1. A cluster = one hub article + N spoke articles tracked as a unit.
 *   2. A domination gate: falsifiable hub-published + spokes-published +
 *      gap-coverage check — not a subjective judgment call.
 *   3. An adjacent-topic proposer: mines competitor headings already stored
 *      by competitor_analyzer.mjs, combined with RIE scout candidates,
 *      filtered to stay adjacent to the finished cluster.
 *
 * IMPORTANT DESIGN NOTES:
 *   - Uses our existing async sqlite3 getDb() from scoutdb.mjs,
 *     NOT better-sqlite3 (would be a second incompatible DB client).
 *   - Does NOT auto-create new clusters or artifacts — proposals come back
 *     for human review. Consistent with the "new article = human review"
 *     autonomy tier already established in mission_control.mjs.
 *   - Does NOT import from mission_control.mjs to avoid circular dependency.
 *     Cluster state is managed here; FSM state lives in mission_control.
 *
 * Depends on:
 *   - scoutdb.mjs (getDb)
 *   - competitor_analyzer.mjs (competitor_snapshots table, must run migrate first)
 */

import { getDb } from './scoutdb.mjs';
import dotenv from 'dotenv';
dotenv.config();

const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_MODEL   = process.env.LLM_MODEL || 'openai/gpt-4o-mini';

// ─── LLM helper ──────────────────────────────────────────────────────────────

async function callLLM(systemPrompt, userPrompt, maxTokens = 800) {
    if (!LLM_API_KEY) throw new Error('[ClusterManager] Missing LLM_API_KEY in .env');
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LLM_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: LLM_MODEL,
            max_tokens: maxTokens,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        })
    });
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
}

// ─── DB Schema ────────────────────────────────────────────────────────────────

export async function migrateClusterSchema() {
    const db = await getDb();

    await db.exec(`
        CREATE TABLE IF NOT EXISTS clusters (
            id                      INTEGER PRIMARY KEY AUTOINCREMENT,
            topic_name              TEXT NOT NULL UNIQUE,
            hub_artifact_id         TEXT,
            status                  TEXT DEFAULT 'ACTIVE',   -- ACTIVE | DOMINATED | PAUSED
            target_spoke_count      INTEGER DEFAULT 5,
            spokes_published        INTEGER DEFAULT 0,
            gaps_total              INTEGER DEFAULT 0,
            gaps_addressed          INTEGER DEFAULT 0,
            gap_coverage_threshold  REAL DEFAULT 0.7,
            created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
            dominated_at            DATETIME
        );
    `);

    // Extend artifacts table with cluster fields if not already present
    const cols = await db.all("PRAGMA table_info(artifacts)");
    const colNames = cols.map(c => c.name);

    if (!colNames.includes('cluster_id')) {
        await db.exec("ALTER TABLE artifacts ADD COLUMN cluster_id INTEGER");
        console.log('[ClusterManager] Added cluster_id to artifacts.');
    }
    if (!colNames.includes('cluster_role')) {
        await db.exec("ALTER TABLE artifacts ADD COLUMN cluster_role TEXT");
        console.log('[ClusterManager] Added cluster_role to artifacts.');
    }
    if (!colNames.includes('target_keyword')) {
        await db.exec("ALTER TABLE artifacts ADD COLUMN target_keyword TEXT");
        console.log('[ClusterManager] Added target_keyword to artifacts.');
    }
    if (!colNames.includes('competitor_urls')) {
        await db.exec("ALTER TABLE artifacts ADD COLUMN competitor_urls TEXT");
        console.log('[ClusterManager] Added competitor_urls to artifacts (JSON array).');
    }

    console.log('[ClusterManager] DB schema migration complete.');
}

// ─── Cluster Lifecycle ────────────────────────────────────────────────────────

export async function createCluster(topicName, targetSpokeCount = 5) {
    const db = await getDb();
    const result = await db.run(
        "INSERT OR IGNORE INTO clusters (topic_name, target_spoke_count) VALUES (?, ?)",
        [topicName, targetSpokeCount]
    );
    const clusterId = result.lastID;
    console.log(`[ClusterManager] 🆕 Cluster created: "${topicName}" (id: ${clusterId}, target spokes: ${targetSpokeCount})`);
    return clusterId;
}

export async function setHubArticle(clusterId, artifactId) {
    const db = await getDb();
    await db.run("UPDATE clusters SET hub_artifact_id = ? WHERE id = ?", [artifactId, clusterId]);
    await db.run("UPDATE artifacts SET cluster_id = ?, cluster_role = 'HUB' WHERE id = ?", [clusterId, artifactId]);
    console.log(`[ClusterManager] 🏠 Hub article set for cluster ${clusterId}: artifact ${artifactId}`);
}

export async function addSpokeArticle(clusterId, artifactId) {
    const db = await getDb();
    await db.run("UPDATE artifacts SET cluster_id = ?, cluster_role = 'SPOKE' WHERE id = ?", [clusterId, artifactId]);
    console.log(`[ClusterManager] 🔗 Spoke article added to cluster ${clusterId}: artifact ${artifactId}`);
}

/**
 * Call this from the PUBLISHED handler in mission_control.mjs to increment
 * spoke count. Kept as a separate import to avoid circular dependency.
 */
export async function onArtifactPublished(artifactId) {
    const db = await getDb();
    const art = await db.get("SELECT cluster_id, cluster_role FROM artifacts WHERE id = ?", [artifactId]);
    if (!art?.cluster_id) return;
    if (art.cluster_role === 'SPOKE') {
        await db.run("UPDATE clusters SET spokes_published = spokes_published + 1 WHERE id = ?", [art.cluster_id]);
        console.log(`[ClusterManager] 📈 Spoke published. Cluster ${art.cluster_id} count updated.`);
    }
}

/**
 * Record gap coverage progress after each competitor benchmark gate run.
 * Called from mission_control's REVIEWING handler.
 */
export async function recordGapProgress(clusterId, gapsTotal, gapsAddressed) {
    const db = await getDb();
    await db.run(
        "UPDATE clusters SET gaps_total = gaps_total + ?, gaps_addressed = gaps_addressed + ? WHERE id = ?",
        [gapsTotal, gapsAddressed, clusterId]
    );
}

// ─── Domination Gate ──────────────────────────────────────────────────────────

export async function checkDominationGate(clusterId) {
    const db = await getDb();
    const cluster = await db.get("SELECT * FROM clusters WHERE id = ?", [clusterId]);
    if (!cluster) throw new Error(`[ClusterManager] No cluster with id ${clusterId}`);

    let hubPublished = false;
    if (cluster.hub_artifact_id) {
        const hub = await db.get("SELECT fsm_state FROM artifacts WHERE id = ?", [cluster.hub_artifact_id]);
        hubPublished = hub?.fsm_state === 'PUBLISHED';
    }

    const spokesTargetMet = cluster.spokes_published >= cluster.target_spoke_count;
    const gapCoverage = cluster.gaps_total > 0
        ? cluster.gaps_addressed / cluster.gaps_total
        : 0;
    const gapTargetMet = gapCoverage >= cluster.gap_coverage_threshold;

    const pass = hubPublished && spokesTargetMet && gapTargetMet;

    const report = {
        pass,
        clusterId,
        topicName: cluster.topic_name,
        hubPublished,
        spokesPublished: cluster.spokes_published,
        spokesTarget: cluster.target_spoke_count,
        spokesTargetMet,
        gapCoverage: Number(gapCoverage.toFixed(2)),
        gapCoverageThreshold: cluster.gap_coverage_threshold,
        gapTargetMet,
    };

    if (pass) {
        console.log(`[ClusterManager] 🏆 DOMINATION GATE PASSED for "${cluster.topic_name}"!`);
        await db.run(
            "UPDATE clusters SET status = 'DOMINATED', dominated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [clusterId]
        );
    } else {
        console.log(`[ClusterManager] Gate check for "${cluster.topic_name}":`);
        console.log(`  Hub published:  ${hubPublished ? '✅' : '❌'}`);
        console.log(`  Spokes:         ${cluster.spokes_published}/${cluster.target_spoke_count} ${spokesTargetMet ? '✅' : '❌'}`);
        console.log(`  Gap coverage:   ${(gapCoverage * 100).toFixed(0)}% / ${(cluster.gap_coverage_threshold * 100).toFixed(0)}% ${gapTargetMet ? '✅' : '❌'}`);
    }

    return report;
}

// ─── Adjacent-Topic Proposer ──────────────────────────────────────────────────

/**
 * Mines competitor headings already stored in competitor_snapshots by
 * competitor_analyzer.mjs. Filters out headings that substantially overlap
 * with topics we already cover in this cluster.
 *
 * Note: overlap detection is keyword-based (simple word intersection),
 * not semantic embedding similarity. This is intentional — transparent,
 * cheap, and easy to reason about. Upgrade to embeddings only if the
 * false-positive rate (flagging non-adjacent topics as adjacent) proves
 * problematic in practice.
 */
function mineAdjacentCandidatesFromHeadings(clusterArtifacts, snapshots) {
    const ownWords = new Set(
        clusterArtifacts.flatMap(a => (a.title || '').toLowerCase().split(/\W+/)).filter(w => w.length > 3)
    );

    const candidateMap = new Map();
    for (const snap of snapshots) {
        let headings = [];
        try { headings = JSON.parse(snap.headings_json || '[]'); } catch { continue; }

        for (const h of headings) {
            const text = (h.text || '').trim();
            if (text.length < 8 || text.length > 120) continue;
            const words = text.toLowerCase().split(/\W+/).filter(Boolean);
            const overlapsOwn = words.some(w => ownWords.has(w));
            if (!overlapsOwn) {
                candidateMap.set(text, (candidateMap.get(text) || 0) + 1);
            }
        }
    }

    return [...candidateMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([text, count]) => ({ heading: text, competitorMentions: count }));
}

/**
 * proposeAdjacentTopics — only callable once the cluster is DOMINATED.
 * Returns a list of human-readable topic proposals for you to review,
 * NOT new artifacts. You decide which to approve.
 *
 * @param {number} clusterId
 * @param {Array}  scoutCandidates — optional array of {title} from rie_planner.mjs
 */
export async function proposeAdjacentTopics(clusterId, scoutCandidates = []) {
    const db = await getDb();
    const cluster = await db.get("SELECT * FROM clusters WHERE id = ?", [clusterId]);
    if (!cluster) throw new Error(`[ClusterManager] No cluster ${clusterId}`);

    if (cluster.status !== 'DOMINATED') {
        throw new Error(
            `[ClusterManager] Cluster "${cluster.topic_name}" is not DOMINATED yet. ` +
            `Run checkDominationGate() first. Proposing next topics before finishing this one defeats the point.`
        );
    }

    // Get all artifacts in this cluster
    const clusterArtifacts = await db.all(
        "SELECT id, title FROM artifacts WHERE cluster_id = ?",
        [clusterId]
    );

    if (clusterArtifacts.length === 0) {
        console.warn('[ClusterManager] No artifacts found in this cluster — cannot mine adjacent topics.');
        return [];
    }

    // Get competitor snapshots across all articles in this cluster
    const artIds = clusterArtifacts.map(a => a.id);
    const placeholders = artIds.map(() => '?').join(',');
    const snapshots = await db.all(
        `SELECT headings_json FROM competitor_snapshots WHERE artifact_id IN (${placeholders})`,
        artIds
    );

    const headingCandidates = mineAdjacentCandidatesFromHeadings(clusterArtifacts, snapshots);
    const scoutTitles = scoutCandidates.map(c => c.title || '').filter(Boolean);

    const ownTitles = clusterArtifacts.map(a => a.title).join('\n');
    const candidatesText = [
        '--- Competitor Heading Candidates ---',
        headingCandidates.map(c => `"${c.heading}" (seen in ${c.competitorMentions} competitor pages)`).join('\n'),
        '',
        '--- Scout/Trend Candidates ---',
        scoutTitles.join('\n') || 'NONE',
    ].join('\n');

    const system = `You are a content strategist. Given a set of articles we already own, and a list of candidate topics from competitor headings and trending searches, propose the 5 BEST adjacent topics we should cover next.

Criteria:
- Must be closely related to what we already cover (same reader, same intent).
- Must NOT overlap substantially with any existing article title.
- Must be a complete, specific article topic, not a vague category.
- Prioritize topics appearing in multiple competitor sites (higher demand signal).

Return only a numbered list of 5 specific article titles. No explanations.`;

    const prompt = `ARTICLES WE ALREADY OWN:\n${ownTitles}\n\nCANDIDATE TOPICS:\n${candidatesText}`;
    const result = await callLLM(system, prompt, 400);

    console.log(`\n[ClusterManager] 💡 Adjacent topic proposals for "${cluster.topic_name}":\n${result}`);
    return result.split('\n').filter(Boolean);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getClusterDashboard() {
    const db = await getDb();
    const clusters = await db.all("SELECT * FROM clusters ORDER BY status ASC, created_at DESC");
    return clusters;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('cluster_manager.mjs')) {
    const [,, action, ...args] = process.argv;

    (async () => {
        await migrateClusterSchema();

        if (action === 'migrate') {
            // Already done above
        } else if (action === 'create') {
            const [topicName, spokesStr] = args;
            if (!topicName) { console.log('Usage: cluster_manager.mjs create "Topic Name" [spokes=5]'); return; }
            await createCluster(topicName, parseInt(spokesStr) || 5);
        } else if (action === 'gate') {
            const [clusterIdStr] = args;
            if (!clusterIdStr) { console.log('Usage: cluster_manager.mjs gate <clusterId>'); return; }
            const report = await checkDominationGate(parseInt(clusterIdStr));
            console.log('\n' + JSON.stringify(report, null, 2));
        } else if (action === 'propose') {
            const [clusterIdStr] = args;
            if (!clusterIdStr) { console.log('Usage: cluster_manager.mjs propose <clusterId>'); return; }
            await proposeAdjacentTopics(parseInt(clusterIdStr));
        } else if (action === 'dashboard') {
            const clusters = await getClusterDashboard();
            console.log('\n[CLUSTER DASHBOARD]\n');
            for (const c of clusters) {
                const icon = c.status === 'DOMINATED' ? '🏆' : c.status === 'PAUSED' ? '⏸️' : '🟢';
                const gapPct = c.gaps_total > 0 ? ((c.gaps_addressed / c.gaps_total) * 100).toFixed(0) : '0';
                console.log(`${icon} [${c.status}] "${c.topic_name}"`);
                console.log(`   Spokes: ${c.spokes_published}/${c.target_spoke_count} | Gap Coverage: ${gapPct}% | Created: ${c.created_at}`);
            }
        } else {
            console.log('Usage: node scripts/cluster_manager.mjs [migrate|create|gate|propose|dashboard]');
            console.log('  migrate              — Create/update cluster DB tables');
            console.log('  create "Topic" [N]   — Create a new topic cluster with N spokes (default 5)');
            console.log('  gate <clusterId>     — Run the domination gate check');
            console.log('  propose <clusterId>  — Propose adjacent topics for a DOMINATED cluster');
            console.log('  dashboard            — Show all cluster statuses');
        }
    })().catch(console.error);
}
