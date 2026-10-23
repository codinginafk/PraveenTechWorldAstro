import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to run a script and wait for it to finish
function runScript(scriptName) {
    return new Promise((resolve, reject) => {
        console.log(`\n==========================================`);
        console.log(`[Orchestrator] Starting: ${scriptName}`);
        console.log(`==========================================\n`);
        
        const scriptPath = path.resolve(__dirname, scriptName);
        const child = fork(scriptPath);

        child.on('error', (err) => {
            reject(err);
        });

        child.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Script ${scriptName} exited with code ${code}`));
            }
        });
    });
}

async function runMasterOrchestrator() {
    console.log("🚀 INITIALIZING RESEARCH INTELLIGENCE ENGINE (RIE) 🚀\n");
    
    try {
        // Step 1: Ensure DB is initialized
        await runScript('scoutdb.mjs');
        
        // Step 2: The Deterministic Ingestion Pipeline
        await runScript('rie_ingestion.mjs');
        
        // Step 3: Google Trends Enrichment
        await runScript('rie_trends.mjs');
        
        // Step 4: Recursive Mission Planner (LLM Evaluation)
        await runScript('rie_planner.mjs');
        
        // Step 5: Dashboard Generation
        await runScript('dashboard_generator.mjs');
        
        console.log(`\n✅ RIE RUN COMPLETE. Please check DRAFT_QUEUE.md for results.\n`);
    } catch (err) {
        console.error(`\n❌ RIE RUN FAILED:`, err.message);
        process.exit(1);
    }
}

if (process.argv[1] === import.meta.url || process.argv[1].endsWith('run_rie_agent.mjs')) {
    runMasterOrchestrator().catch(console.error);
}
