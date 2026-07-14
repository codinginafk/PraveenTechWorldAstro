import fs from 'fs/promises';
import { runCompetitorBenchmarkGate } from './scripts/competitor_analyzer.mjs';

async function validateSpoke2() {
    console.log("=== Starting Validation for Spoke 2 ===");
    const draftPath = './drafts/2.draft.md';
    const artifactId = '2'; // Must match the ID we inserted into scoutdb
    const keyword = 'observability and circuit breakers for llm agent pipelines';

    try {
        const draftText = await fs.readFile(draftPath, 'utf-8');

        console.log("\n[1] Running Competitor Benchmark Gate...");
        const benchResult = await runCompetitorBenchmarkGate(artifactId, draftText, keyword);
        console.log("Benchmark Result:", JSON.stringify(benchResult, null, 2));

        if (!benchResult.pass) {
            console.warn("❌ Competitor Benchmark Gate FAILED. The draft needs patching.");
        } else if (benchResult.reason === "no_baseline") {
            console.log("⚠️ Competitor Benchmark Gate SKIPPED (no baseline).");
        } else {
            console.log("✅ Competitor Benchmark Gate PASSED.");
        }
    } catch (e) {
        console.error("\n💥 Validation crashed.");
        console.error(e.message);
    }
}

validateSpoke2().catch(console.error);
