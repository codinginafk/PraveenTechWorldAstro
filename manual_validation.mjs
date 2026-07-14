import fs from 'fs/promises';
import { runCompetitorBenchmarkGate } from './scripts/competitor_analyzer.mjs';
import { runScorer } from './scripts/content_scorer.mjs';

async function validate() {
    console.log("=== Starting Manual Validation ===");
    const draftText = await fs.readFile('C:/Users/bunny/.gemini/antigravity/brain/db8d935a-7a82-4063-8e99-0c1135abc327/draft.md', 'utf-8');

    console.log("\n[1] Running Competitor Benchmark Gate...");
    try {
        const benchResult = await runCompetitorBenchmarkGate('art_1783544603124', draftText, 'preventing infinite loops LLM agent pipeline');
        console.log("Benchmark Result:", JSON.stringify(benchResult, null, 2));
    } catch (e) {
        console.error("Benchmark failed:", e.message);
    }

    console.log("\n[2] Running Content Scorer (Skeptic/Policy)...");
    try {
        const scorerResult = await runScorer('C:/Users/bunny/.gemini/antigravity/brain/db8d935a-7a82-4063-8e99-0c1135abc327/draft.md');
        console.log("Scorer Result:", JSON.stringify(scorerResult, null, 2));
    } catch (e) {
        console.error("Scorer failed:", e.message);
    }
}

validate().catch(console.error);
