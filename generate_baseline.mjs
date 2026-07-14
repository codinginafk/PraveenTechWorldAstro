import { fetchAndAnalyzeCompetitors } from './scripts/competitor_analyzer.mjs';

async function run() {
    const artifactId = 'art_1783544603124';
    const keyword = 'preventing infinite loops LLM agent pipeline';
    console.log("Generating competitor baseline for", keyword);
    await fetchAndAnalyzeCompetitors(artifactId, keyword);
    console.log("Baseline generation complete.");
}

run().catch(console.error);
