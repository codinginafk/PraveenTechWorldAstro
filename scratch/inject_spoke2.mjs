import { getDb } from '../scripts/scoutdb.mjs';
import Database from 'better-sqlite3';

async function createArtifact() {
    const topic = 'observability and circuit breakers for llm agent pipelines';
    const clusterId = 2; 
    const state = 'DISCOVERED';
    
    // We will force the ID to be exactly "2" in both DBs to keep them synced.
    const artifactId = '2'; 

    // 1. Insert into scoutdb
    const scoutDb = await getDb();
    await scoutDb.run(
        `INSERT INTO artifacts (id, title, fsm_state, target_keyword, cluster_id, cluster_role)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            artifactId, 
            'Circuit Breakers and Telemetry: How to Monitor and Stop Runaway LLM Agents',
            state,
            topic,
            clusterId,
            'spoke'
        ]
    );
    console.log("Inserted into scoutdb.sqlite:", artifactId);

    // 2. Insert into mission_control.sqlite
    const mcDb = new Database('./mission_control.sqlite');
    const stmt = mcDb.prepare(
        `INSERT INTO artifacts (id, topic, state, pillar, scout_score)
         VALUES (?, ?, ?, ?, ?)`
    );
    const info = stmt.run(2, topic, state, 'B', 0.95);
    console.log("Inserted into mission_control.sqlite with internal ID:", info.lastInsertRowid);
}

createArtifact().catch(console.error);
