import { getDb } from './scripts/scoutdb.mjs';

async function checkDb() {
    const db = await getDb();
    
    // Check clusters table
    const clusters = await db.all("SELECT id, name, gaps_total, gaps_addressed FROM clusters");
    console.log("CLUSTERS TABLE:");
    console.table(clusters);

    // Check gate_evaluations
    const evals = await db.all("SELECT id, artifact_id, gate_name, passed, addressed_count, missing_count FROM gate_evaluations ORDER BY evaluated_at DESC LIMIT 5");
    console.log("\nGATE_EVALUATIONS TABLE:");
    console.table(evals);
}

checkDb().catch(console.error);
