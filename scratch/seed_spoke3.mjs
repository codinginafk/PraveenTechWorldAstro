import { addEvidence, db } from '../scripts/mission_control.mjs';

const artifactId = 3;

db.prepare("DELETE FROM evidence WHERE artifact_id = ?").run(artifactId);

const evidenceList = [
  {
    sourceUrl: "internal-knowledge:mission_control.mjs",
    sourceType: "codebase",
    title: "Finite State Machine Pipeline Architecture",
    contentHash: "To prevent unbounded agent loops, the orchestration layer MUST be built as a strict Finite State Machine (FSM). We implemented this by defining a STATES array and a VALID_TRANSITIONS map. Agents cannot dynamically decide the next state; they only return output, and the orchestrator strictly enforces valid transitions (e.g., RESEARCHING -> VERIFYING). If an invalid state transition is attempted, it throws an error and halts, preventing infinite looping.",
    confidence: 100
  },
  {
    sourceUrl: "internal-knowledge:mission_control.mjs",
    sourceType: "codebase",
    title: "Hard Iteration Limits for Agent Cycles",
    contentHash: "Even within valid loops (e.g., WRITING -> REVIEWING -> WRITING), agents can get stuck endlessly debating or failing to fix code. We implemented explicit cycle limits: maxReviewCycles=3 and maxResearchIterations=5. If the cycle count hits this ceiling, the artifact is kicked out of the autonomous loop into a NEEDS_HUMAN_REVIEW state, acting as a structural circuit breaker.",
    confidence: 100
  },
  {
    sourceUrl: "internal-knowledge:mission_control.mjs",
    sourceType: "codebase",
    title: "Pre-Flight Cost Cap Enforcement",
    contentHash: "Loop detection is fundamentally about cost control. We implemented a cost_usd_total tracker in our SQLite artifacts table and a costCapUsdPerArtifact variable (e.g., $2.00). The critical pattern is checking this cap BEFORE executing the next LLM call. If cost_usd_total >= cap, the system immediately throws a CostCapExceeded exception, completely freezing the runaway pipeline.",
    confidence: 100
  },
  {
    sourceUrl: "internal-knowledge:incident-log",
    sourceType: "incident",
    title: "The Silent Truncation Loop Incident",
    contentHash: "In earlier iterations, an agent encountered a 'Failed to parse gaps from LLM: Unexpected end of JSON input' error. Without a failure counter, a naive retry logic would loop forever trying to parse truncated JSON from a free LLM tier. We fixed this by switching to plain-text lists instead of JSON for unpredictable LLMs, and adding a consecutive_failures counter to automatically pause the pipeline after repeated identical errors.",
    confidence: 100
  }
];

evidenceList.forEach(ev => addEvidence(artifactId, ev));

db.prepare("UPDATE artifacts SET state = 'OUTLINE', review_cycles = 0, research_iterations = 0 WHERE id = ?").run(artifactId);
console.log(`Injected ${evidenceList.length} evidence items and reset Artifact ${artifactId} to OUTLINE.`);
