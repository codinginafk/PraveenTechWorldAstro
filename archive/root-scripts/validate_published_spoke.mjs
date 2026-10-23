import fs from 'fs/promises';
import { runCompetitorBenchmarkGate } from './scripts/competitor_analyzer.mjs';
import { runScorer } from './scripts/content_scorer.mjs';

async function validateSpoke1() {
    console.log("=== Starting Post-Publish Validation for Spoke 1 ===");
    const draftPath = 'C:/Users/bunny/.gemini/antigravity/brain/db8d935a-7a82-4063-8e99-0c1135abc327/draft.md';
    const artifactId = 'art_1783544603124';
    const keyword = 'preventing infinite loops LLM agent pipeline';

    try {
        const draftText = await fs.readFile(draftPath, 'utf-8');

        console.log("\n[1] Running Competitor Benchmark Gate...");
        const benchResult = await runCompetitorBenchmarkGate(artifactId, draftText, keyword);
        console.log("Benchmark Result:", JSON.stringify(benchResult, null, 2));

        if (!benchResult.pass) {
            console.warn("⚠️ Competitor Benchmark Gate FAILED. The live article needs patching.");
        } else if (benchResult.reason === "no_baseline") {
            console.log("⏭️ Competitor Benchmark Gate SKIPPED (no baseline).");
        } else {
            console.log("✅ Competitor Benchmark Gate PASSED.");
        }

        console.log("\n[2] Running Content Scorer (Policy/Evidence Checks)...");
        const scorerResult = await runScorer(draftPath);
        console.log("Scorer Result:", JSON.stringify(scorerResult, null, 2));

        if (!scorerResult.approved) {
            console.warn("⚠️ Content Scorer FAILED. The live article needs patching.");
        } else {
            console.log("✅ Content Scorer PASSED.");
        }

        console.log("\nValidation Complete. If any checks failed, update draft.md and run:");
        console.log(`node scripts/syndicator.mjs publish ${draftPath} C:/Users/bunny/.gemini/antigravity/brain/db8d935a-7a82-4063-8e99-0c1135abc327/social_posts_deadend.md`);

    } catch (e) {
        console.error("\n❌ Validation crashed. Are you still hitting the OpenRouter 402 API error?");
        console.error(e.message);
    }
}

validateSpoke1().catch(console.error);
