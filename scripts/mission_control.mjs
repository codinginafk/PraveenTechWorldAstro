/**
 * mission_control.mjs
 * ============================================================
 * The FSM (Finite State Machine) core of the Knowledge Operations Platform.
 * 
 * Rules:
 *   - Mission Control never writes, searches, or generates content.
 *   - It only evaluates the current state of an artifact and decides next routing.
 *   - All transitions are validated against VALID_TRANSITIONS.
 *   - Deadlock guards prevent infinite loops.
 *   - NEEDS_HUMAN_REVIEW is the escape hatch for stuck artifacts.
 * ============================================================
 */

import { getDb } from './scoutdb.mjs';

// ─── State Definitions ────────────────────────────────────────────────────────

export const STATES = {
    DISCOVERED:           'DISCOVERED',
    RESEARCHING:          'RESEARCHING',
    VERIFYING:            'VERIFYING',
    OUTLINE:              'OUTLINE',
    WRITING:              'WRITING',
    REVIEWING:            'REVIEWING',
    READY:                'READY',
    PUBLISHED:            'PUBLISHED',
    MONITORING:           'MONITORING',
    UPDATE_NEEDED:        'UPDATE_NEEDED',
    NEEDS_HUMAN_REVIEW:   'NEEDS_HUMAN_REVIEW',
    ABANDONED:            'ABANDONED'
};

// ─── Legal Transition Map ──────────────────────────────────────────────────────
// Only transitions listed here are permitted. Any other transition throws an error.

const VALID_TRANSITIONS = {
    [STATES.DISCOVERED]:          [STATES.RESEARCHING],
    [STATES.RESEARCHING]:         [STATES.VERIFYING, STATES.RESEARCHING, STATES.NEEDS_HUMAN_REVIEW],
    [STATES.VERIFYING]:           [STATES.OUTLINE, STATES.RESEARCHING, STATES.ABANDONED],
    [STATES.OUTLINE]:             [STATES.WRITING, STATES.RESEARCHING],
    [STATES.WRITING]:             [STATES.REVIEWING],
    [STATES.REVIEWING]:           [STATES.WRITING, STATES.RESEARCHING, STATES.READY, STATES.NEEDS_HUMAN_REVIEW],
    [STATES.READY]:               [STATES.PUBLISHED],
    [STATES.PUBLISHED]:           [STATES.MONITORING],
    [STATES.MONITORING]:          [STATES.UPDATE_NEEDED, STATES.PUBLISHED],
    [STATES.UPDATE_NEEDED]:       [STATES.RESEARCHING],
    [STATES.NEEDS_HUMAN_REVIEW]:  [STATES.RESEARCHING, STATES.OUTLINE, STATES.ABANDONED],
    [STATES.ABANDONED]:           []
};

// ─── Deadlock Guards ───────────────────────────────────────────────────────────

const MAX_REVIEWING_CYCLES  = 3;   // Max times an article loops between REVIEWING → WRITING
const MAX_RESEARCH_CYCLES   = 5;   // Max times a topic loops back to RESEARCHING

// ─── DB Schema Migration ───────────────────────────────────────────────────────

export async function migrateDb() {
    const db = await getDb();

    // Extend topics table with FSM state and cycle tracking
    await db.exec(`
        CREATE TABLE IF NOT EXISTS artifacts (
            id              TEXT PRIMARY KEY,
            title           TEXT NOT NULL,
            fsm_state       TEXT DEFAULT 'DISCOVERED',
            research_cycles INTEGER DEFAULT 0,
            review_cycles   INTEGER DEFAULT 0,
            confidence      REAL DEFAULT 0,
            cost_cents      REAL DEFAULT 0,
            knowledge_obj   TEXT,           -- JSON: the Knowledge Object blob
            author_exp      TEXT,           -- JSON: Experience Extractor output
            outline         TEXT,           -- Markdown outline
            draft_path      TEXT,           -- Path to frozen draft file
            editorial_angle TEXT,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Task Queue with priority, dependencies, retries
    await db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
            id          TEXT PRIMARY KEY,
            artifact_id TEXT NOT NULL,
            agent_type  TEXT NOT NULL,   -- 'ingestion', 'planner', 'arch_writer', 'impl_writer', 'trouble_writer', 'skeptic', 'tech_qa', 'scorer'
            priority    INTEGER DEFAULT 3,   -- 1=urgent, 5=low
            depends_on  TEXT,            -- JSON array of task IDs that must be DONE first
            status      TEXT DEFAULT 'pending',  -- pending, running, done, failed, skipped
            retries     INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            cost_cents  REAL DEFAULT 0,
            input       TEXT,            -- JSON payload for the agent
            output      TEXT,            -- JSON result from the agent
            error       TEXT,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(artifact_id) REFERENCES artifacts(id)
        );
    `);

    // Failure Database - every error is stored for learning
    await db.exec(`
        CREATE TABLE IF NOT EXISTS failures (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            artifact_id TEXT,
            agent_type  TEXT,
            error       TEXT,
            input_hash  TEXT,
            resolution  TEXT,
            resolved_at DATETIME,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Knowledge Objects - the primary unit (NOT articles)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_objects (
            id          TEXT PRIMARY KEY,
            topic_id    TEXT NOT NULL,
            entities    TEXT,            -- JSON: ["Docker", "WSL"]
            versions    TEXT,            -- JSON: {"docker_desktop": "4.39"}
            evidence_ids TEXT,           -- JSON: ["ev_248", "ev_312"]
            alternatives TEXT,           -- JSON: ["Podman", "Rancher Desktop"]
            commands    TEXT,            -- JSON array of relevant commands
            author_experience TEXT,      -- NULL until Experience Extractor fills it
            expires_at  DATETIME,        -- when this knowledge needs refreshing
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(topic_id) REFERENCES artifacts(id)
        );
    `);

    console.log('[MissionControl] DB migration complete.');
    return db;
}

// ─── Transition Validator ──────────────────────────────────────────────────────

export function canTransition(fromState, toState) {
    const allowed = VALID_TRANSITIONS[fromState];
    if (!allowed) {
        throw new Error(`[MissionControl] Unknown state: "${fromState}"`);
    }
    if (!allowed.includes(toState)) {
        throw new Error(`[MissionControl] Illegal transition: ${fromState} → ${toState}. Allowed: [${allowed.join(', ')}]`);
    }
    return true;
}

// ─── State Transition Engine ───────────────────────────────────────────────────

export async function transition(artifactId, toState, reason = '') {
    const db = await getDb();
    const artifact = await db.get(`SELECT * FROM artifacts WHERE id = ?`, [artifactId]);

    if (!artifact) throw new Error(`[MissionControl] Artifact not found: ${artifactId}`);

    const fromState = artifact.fsm_state;

    // Validate the transition is legal
    canTransition(fromState, toState);

    // Update cycle counters
    let newResearchCycles = artifact.research_cycles;
    let newReviewCycles   = artifact.review_cycles;

    if (toState === STATES.RESEARCHING) {
        newResearchCycles++;
    }
    if (fromState === STATES.REVIEWING && toState === STATES.WRITING) {
        newReviewCycles++;
    }

    // ── Deadlock Guard ───────────────────────────────────────────────────────
    if (newReviewCycles >= MAX_REVIEWING_CYCLES) {
        console.warn(`[MissionControl] ⚠️  Artifact "${artifact.title}" has hit max review cycles (${MAX_REVIEWING_CYCLES}). Escalating to NEEDS_HUMAN_REVIEW.`);
        await db.run(
            `UPDATE artifacts SET fsm_state = ?, review_cycles = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [STATES.NEEDS_HUMAN_REVIEW, newReviewCycles, artifactId]
        );
        await logFailure(artifactId, 'mission_control', `Max review cycles hit after ${newReviewCycles} loops.`, reason);
        return STATES.NEEDS_HUMAN_REVIEW;
    }

    if (newResearchCycles >= MAX_RESEARCH_CYCLES) {
        console.warn(`[MissionControl] ⚠️  Artifact "${artifact.title}" has hit max research cycles (${MAX_RESEARCH_CYCLES}). Escalating to NEEDS_HUMAN_REVIEW.`);
        await db.run(
            `UPDATE artifacts SET fsm_state = ?, research_cycles = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [STATES.NEEDS_HUMAN_REVIEW, newResearchCycles, artifactId]
        );
        await logFailure(artifactId, 'mission_control', `Max research cycles hit after ${newResearchCycles} loops.`, reason);
        return STATES.NEEDS_HUMAN_REVIEW;
    }

    // ── Commit the transition ────────────────────────────────────────────────
    await db.run(
        `UPDATE artifacts 
         SET fsm_state = ?, research_cycles = ?, review_cycles = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [toState, newResearchCycles, newReviewCycles, artifactId]
    );

    console.log(`[MissionControl] ✅ ${artifact.title}: ${fromState} → ${toState} | Reason: ${reason || 'N/A'}`);
    return toState;
}

// ─── Task Queue Helpers ────────────────────────────────────────────────────────

export async function enqueueTask(artifactId, agentType, input = {}, priority = 3, dependsOn = []) {
    const db = await getDb();
    const taskId = `task_${Date.now()}_${agentType}`;
    await db.run(
        `INSERT INTO tasks (id, artifact_id, agent_type, priority, depends_on, input) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [taskId, artifactId, agentType, priority, JSON.stringify(dependsOn), JSON.stringify(input)]
    );
    console.log(`[MissionControl] 📋 Task queued: ${agentType} for artifact ${artifactId} (priority: ${priority})`);
    return taskId;
}

export async function getNextTask() {
    const db = await getDb();
    // Get highest-priority pending task whose dependencies are all done
    const task = await db.get(`
        SELECT t.* FROM tasks t
        WHERE t.status = 'pending'
        AND t.retries < t.max_retries
        AND NOT EXISTS (
            SELECT 1 FROM tasks dep
            WHERE dep.id IN (SELECT value FROM json_each(t.depends_on))
            AND dep.status != 'done'
        )
        ORDER BY t.priority ASC, t.created_at ASC
        LIMIT 1
    `);
    return task;
}

export async function completeTask(taskId, output = {}, costCents = 0) {
    const db = await getDb();
    await db.run(
        `UPDATE tasks SET status = 'done', output = ?, cost_cents = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [JSON.stringify(output), costCents, taskId]
    );
}

export async function failTask(taskId, error = '') {
    const db = await getDb();
    await db.run(
        `UPDATE tasks SET status = 'failed', retries = retries + 1, error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [error, taskId]
    );
    // Requeue as pending if retries < max_retries
    await db.run(
        `UPDATE tasks SET status = 'pending' WHERE id = ? AND retries < max_retries`,
        [taskId]
    );
}

// ─── Failure Logger ────────────────────────────────────────────────────────────

export async function logFailure(artifactId, agentType, error, inputContext = '') {
    const db = await getDb();
    await db.run(
        `INSERT INTO failures (artifact_id, agent_type, error, input_hash) VALUES (?, ?, ?, ?)`,
        [artifactId, agentType, error, Buffer.from(inputContext).toString('base64').slice(0, 64)]
    );
}

// ─── Artifact Factory ──────────────────────────────────────────────────────────

export async function createArtifact(title, editorialAngle = '') {
    const db = await getDb();
    const id = `art_${Date.now()}`;
    await db.run(
        `INSERT INTO artifacts (id, title, fsm_state, editorial_angle) VALUES (?, ?, ?, ?)`,
        [id, title, STATES.DISCOVERED, editorialAngle]
    );
    console.log(`[MissionControl] 🆕 Artifact created: "${title}" (id: ${id})`);
    return id;
}

// ─── Dashboard Query ───────────────────────────────────────────────────────────

export async function getDashboard() {
    const db = await getDb();
    return db.all(`
        SELECT id, title, fsm_state, confidence, research_cycles, review_cycles, cost_cents, updated_at
        FROM artifacts
        ORDER BY 
            CASE fsm_state
                WHEN 'NEEDS_HUMAN_REVIEW' THEN 0
                WHEN 'READY' THEN 1
                WHEN 'REVIEWING' THEN 2
                WHEN 'WRITING' THEN 3
                WHEN 'OUTLINE' THEN 4
                WHEN 'VERIFYING' THEN 5
                WHEN 'RESEARCHING' THEN 6
                WHEN 'DISCOVERED' THEN 7
                WHEN 'MONITORING' THEN 8
                ELSE 9
            END,
            confidence DESC
    `);
}

// ─── Cost Controller ──────────────────────────────────────────────────────────

const COST_BUDGET_CENTS = 50; // Hard cap: $0.50 per mission run

export async function getTotalCost() {
    const db = await getDb();
    const result = await db.get(`SELECT SUM(cost_cents) as total FROM tasks WHERE status = 'done'`);
    return result?.total || 0;
}

async function checkBudget(artifactId) {
    const db = await getDb();
    const result = await db.get(
        `SELECT SUM(cost_cents) as total FROM tasks WHERE artifact_id = ?`,
        [artifactId]
    );
    const spent = result?.total || 0;
    if (spent >= COST_BUDGET_CENTS) {
        console.warn(`[MissionControl] 💸 Budget cap hit for artifact ${artifactId} ($${(spent/100).toFixed(2)}). Escalating to NEEDS_HUMAN_REVIEW.`);
        return false;
    }
    return true;
}

// ─── Agent Dispatcher ─────────────────────────────────────────────────────────
// This is the ROUTING ENGINE — the actual brain of Mission Control.
// It reads the current state and dispatches the correct agent.

async function dispatch(artifact) {
    const { id, fsm_state, title } = artifact;

    // Budget check before every dispatch
    const withinBudget = await checkBudget(id);
    if (!withinBudget) {
        await transition(id, STATES.NEEDS_HUMAN_REVIEW, 'Budget exhausted');
        return;
    }

    console.log(`[MissionControl] 🚦 Dispatching "${title}" in state: ${fsm_state}`);

    switch (fsm_state) {
        case STATES.DISCOVERED: {
            // Route to ingestion — start evidence gathering
            await enqueueTask(id, 'ingestion', { title }, 1);
            await transition(id, STATES.RESEARCHING, 'Auto-dispatched to ingestion');
            break;
        }

        case STATES.RESEARCHING: {
            // Run the RIE planner to evaluate confidence
            const { runPlanner } = await import('./rie_planner.mjs').catch(() => ({ runPlanner: null }));
            if (runPlanner) {
                await runPlanner(id);
            } else {
                console.error('[MissionControl] rie_planner.mjs not found.');
            }
            // After planner runs, check if evidence is sufficient to move to VERIFYING
            const db = await getDb();
            const updated = await db.get(`SELECT confidence_score FROM topics WHERE title = ?`, [title]);
            const confidence = updated?.confidence_score || 0;
            if (confidence >= 80) {
                await transition(id, STATES.VERIFYING, `Confidence ${confidence}% — sufficient evidence`);
            } else {
                console.log(`[MissionControl] Confidence ${confidence}% — staying in RESEARCHING for next cycle.`);
            }
            break;
        }

        case STATES.VERIFYING: {
            // Step 1: Validate search intent BEFORE we invest in writing
            const { validateSearchIntent } = await import('./seo_engine.mjs').catch(() => ({ validateSearchIntent: null }));
            if (validateSearchIntent) {
                const intent = await validateSearchIntent(title);
                if (intent?.verdict === 'SKIP') {
                    console.log(`[MissionControl] ⛔ Search intent too low for "${title}". Abandoning.`);
                    await transition(id, STATES.ABANDONED, `Search intent: SKIP — ${intent.reasoning}`);
                    break;
                }
                // Store target queries for SEO later
                const db2 = await getDb();
                await db2.run(
                    `UPDATE artifacts SET knowledge_obj = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [JSON.stringify({ search_intent: intent }), id]
                );
            }

            // Step 2: Run GitHub worker for additional evidence
            const { runGithubWorker } = await import('./rie_github.mjs').catch(() => ({ runGithubWorker: null }));
            if (runGithubWorker) {
                await runGithubWorker([title.split(' ').slice(0, 4).join(' ')]);
            }
            await transition(id, STATES.OUTLINE, 'Evidence verified + search intent validated');
            break;
        }

        case STATES.OUTLINE:
        case STATES.WRITING: {
            // Route to content writer
            const { runContentWriter } = await import('./content_writer.mjs').catch(() => ({ runContentWriter: null }));
            if (runContentWriter) {
                await runContentWriter(id);
            } else {
                console.error('[MissionControl] content_writer.mjs not found.');
            }
            break;
        }

        case STATES.REVIEWING: {
            // Route to content scorer — the QA gatekeeper
            const db = await getDb();
            const artifact = await db.get(`SELECT draft_path FROM artifacts WHERE id = ?`, [id]);
            if (!artifact?.draft_path) {
                console.error(`[MissionControl] No draft_path found for ${id}. Cannot review.`);
                break;
            }
            const { runScorer } = await import('./content_scorer.mjs').catch(() => ({ runScorer: null }));
            if (runScorer) {
                const result = await runScorer(artifact.draft_path);
                if (result?.approved) {
                    await transition(id, STATES.READY, `Scorer approved: ${result.total_score}/20`);
                } else {
                    console.log(`[MissionControl] Scorer rejected draft (${result?.total_score}/20). Routing back to WRITING.`);
                    await transition(id, STATES.WRITING, `Score ${result?.total_score}/20 — needs rewrite`);
                }
            }
            break;
        }

        case STATES.READY: {
            // SEO optimization pass before publishing
            console.log(`[MissionControl] 🟢 "${title}" is READY. Running SEO optimization...`);

            const db3 = await getDb();
            const readyArtifact = await db3.get(`SELECT * FROM artifacts WHERE id = ?`, [id]);
            let draftContent = '';
            if (readyArtifact?.draft_path) {
                try {
                    const fsMod = await import('fs/promises');
                    draftContent = await fsMod.default.readFile(readyArtifact.draft_path, 'utf-8');
                } catch (e) { /* no draft file yet */ }
            }

            const seo = await import('./seo_engine.mjs').catch(() => ({}));
            
            // Optimize title
            if (seo.optimizeTitle) {
                const titleResult = await seo.optimizeTitle(title, draftContent);
                if (titleResult?.variants?.length) {
                    const best = titleResult.variants[titleResult.recommended];
                    console.log(`[MissionControl] 📝 Recommended title: "${best.title}"`);
                }
            }

            // Generate meta description
            if (seo.generateMetaDescription) {
                const metaResult = await seo.generateMetaDescription(title, draftContent);
                if (metaResult?.variants?.length) {
                    const best = metaResult.variants[metaResult.recommended];
                    console.log(`[MissionControl] 📝 Meta description: "${best.description}"`);
                }
            }

            // Generate schema markup
            if (seo.generateSchemaMarkup) {
                await seo.generateSchemaMarkup(title, draftContent);
            }

            // Generate social posts
            console.log(`[MissionControl] 📱 Generating social syndication posts...`);
            // Social syndication is handled via the skill system when user triggers it
            console.log(`[MissionControl] ✅ SEO pass complete. Article is publication-ready.`);
            console.log(`[MissionControl] To publish: move draft from drafts/ to src/content/articles/`);
            break;
        }

        case STATES.MONITORING: {
            console.log(`[MissionControl] 📊 "${title}" — checking for staleness...`);
            // Check if article knowledge object has expired
            const db4 = await getDb();
            const ko = await db4.get(
                `SELECT * FROM knowledge_objects WHERE topic_id = ?`, [id]
            );
            if (ko?.expires_at && new Date(ko.expires_at) < new Date()) {
                console.log(`[MissionControl] ⏰ Knowledge expired for "${title}". Triggering refresh.`);
                await transition(id, STATES.UPDATE_NEEDED, 'Knowledge object expired');
            } else {
                console.log(`[MissionControl] 📊 "${title}" is healthy. No action needed.`);
            }
            break;
        }

        case STATES.NEEDS_HUMAN_REVIEW: {
            console.warn(`[MissionControl] 🚨 "${title}" needs human intervention.`);
            console.warn(`   Check DRAFT_QUEUE.md or run: node scripts/mission_control.mjs dashboard`);
            break;
        }

        default:
            console.log(`[MissionControl] No dispatcher for state: ${fsm_state}`);
    }
}

// ─── Mission Runner ────────────────────────────────────────────────────────────
// Runs one full tick of the Mission Control loop across all active artifacts.

export async function runMission() {
    const db = await getDb();
    const activeStates = [
        STATES.DISCOVERED, STATES.RESEARCHING, STATES.VERIFYING,
        STATES.OUTLINE, STATES.WRITING, STATES.REVIEWING, STATES.READY, STATES.MONITORING, STATES.UPDATE_NEEDED
    ];

    const artifacts = await db.all(
        `SELECT * FROM artifacts WHERE fsm_state IN (${activeStates.map(() => '?').join(',')})`,
        activeStates
    );

    if (artifacts.length === 0) {
        console.log('[MissionControl] No active artifacts to process.');
        return;
    }

    console.log(`[MissionControl] Processing ${artifacts.length} active artifact(s)...`);
    for (const artifact of artifacts) {
        await dispatch(artifact);
    }
    console.log('[MissionControl] Tick complete.');
}

// ─── CLI Entry Point ───────────────────────────────────────────────────────────

if (process.argv[1] && (process.argv[1] === import.meta.url || process.argv[1].endsWith('mission_control.mjs'))) {
    const action = process.argv[2];
    
    (async () => {
        if (action === 'migrate') {
            await migrateDb();
        } else if (action === 'dashboard') {
            const rows = await getDashboard();
            console.log('\n[MissionControl] ARTIFACT DASHBOARD\n');
            for (const r of rows) {
                const flag = r.fsm_state === 'NEEDS_HUMAN_REVIEW' ? '🚨' 
                           : r.fsm_state === 'READY' ? '🟢' 
                           : r.fsm_state === 'MONITORING' ? '📊' : '🔵';
                console.log(`${flag} [${r.fsm_state}] ${r.title}`);
                console.log(`   Confidence: ${r.confidence}% | Research loops: ${r.research_cycles} | Review loops: ${r.review_cycles} | Cost: $${(r.cost_cents / 100).toFixed(4)}`);
            }
        } else if (action === 'test') {
            await migrateDb();
            const id = await createArtifact('Docker Desktop Licensing Changes', 'Cost analysis for enterprise admins');
            await transition(id, STATES.RESEARCHING, 'Initial discovery from HackerNews');
            await transition(id, STATES.VERIFYING, 'Sufficient evidence from GitHub + HN');
            await transition(id, STATES.OUTLINE, 'Evidence verified');
            await transition(id, STATES.WRITING, 'Outline approved');
            await transition(id, STATES.REVIEWING, 'First draft complete');
            console.log('\n[Test] FSM state machine is working correctly!');
            
            // Test illegal transition
            try {
                await transition(id, STATES.PUBLISHED, 'Trying to skip READY state');
            } catch (e) {
                console.log(`[Test] ✅ Illegal transition correctly blocked: ${e.message}`);
            }
        } else if (action === 'run') {
            await runMission();
        } else {
            console.log('Usage: node scripts/mission_control.mjs [migrate|dashboard|test|run]');
            console.log('  migrate    — Create/update all DB tables');
            console.log('  dashboard  — Show all artifacts and their current state');
            console.log('  test       — Run FSM validation tests');
            console.log('  run        — Process one tick across all active artifacts');
        }
    })().catch(console.error);
}
