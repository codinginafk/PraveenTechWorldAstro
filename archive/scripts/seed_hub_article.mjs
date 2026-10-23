import { getDb } from './scoutdb.mjs';
import { createArtifact } from './mission_control.mjs';

async function seed() {
    const db = await getDb();

    const title = "Preventing Infinite Loops in LLM Agent Pipelines: The Dead-End State Trap";
    const editorialAngle = `The Lie of max_iterations: Why simply slapping a retry limit on your LLM agent isn't enough to prevent production outages.
The Anatomy of a State Machine Deadlock (The Real Story): Walk through the exact bug we found tonight. Show the broken VALID_TRANSITIONS table. Show how the very safety mechanism designed to stop the infinite loop created a dead-end trap that paralyzed the pipeline.
Building a Falsifiable Cost Cap: How we implemented a hard stop per-artifact, backed by real database state, rather than relying on the LLM to govern itself.
The "Circuit Breaker" Done Right: Routing failed states not just to a "human review" bin, but ensuring the state machine has a mathematical path to resume once the human clears it.`;

    const options = {
        targetKeyword: "preventing infinite loops LLM agent pipeline",
        competitorUrls: [
            "https://dev.to/alessandro_pignati/stop-the-loop-how-to-prevent-infinite-conversations-in-ai-agents-4o3h",
            "https://inkog.io/glossary/infinite-loop-ai-agent",
            // The exact TDS link was truncated, so using a dev.to fallback for the 3rd to ensure Cheerio gets good data
            "https://dev.to/codemaker2015/stop-hallucinations-and-infinite-loops-in-llms-2kcd" 
        ]
    };

    // Create the artifact
    const id = await createArtifact(title, editorialAngle, options);

    // Attach to cluster ID 2 (which we just created)
    await db.run("UPDATE artifacts SET cluster_id = 2, cluster_role = 'HUB' WHERE id = ?", [id]);
    await db.run("UPDATE clusters SET hub_artifact_id = ? WHERE id = 2", [id]);

    console.log(`\n✅ Hub Artifact Created: ${id}`);
    console.log(`✅ Attached to Cluster ID 2 as HUB.`);
}

seed().catch(console.error);
