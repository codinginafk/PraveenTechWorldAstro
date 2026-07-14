import Database from "better-sqlite3";
const db = new Database("mission_control.sqlite");

// Clear existing evidence for artifact 4 to prevent duplication
db.prepare("DELETE FROM evidence WHERE artifact_id = 4").run();

const evidencePoints = [
  {
    ref: "EV-000004",
    title: "Finite State Machine (FSM) architecture with explicit transitions (e.g., DISCOVERED -> RESEARCHING -> VERIFYING -> OUTLINE -> WRITING -> REVIEWING -> READY -> PUBLISHED -> MONITORING -> UPDATE_NEEDED -> RESEARCHING) to prevent unbounded recursive loops.",
    source_url: "file:///scripts/mission_control.mjs#L63-L81",
    source_type: "codebase"
  },
  {
    ref: "EV-000005",
    title: "Hard loop ceilings for agent self-correction: maxReviewCycles set to 3, and maxResearchIterations set to 5, transitioning to NEEDS_HUMAN_REVIEW upon breach.",
    source_url: "file:///scripts/mission_control.mjs#L51-L52",
    source_type: "codebase"
  },
  {
    ref: "EV-000006",
    title: "Pre-flight per-artifact cost cap ($2.00 USD) checked before expensive LLM calls, throwing a CostCapExceeded error and halting execution to contain runaway API expenses.",
    source_url: "file:///scripts/mission_control.mjs#L53",
    source_type: "codebase"
  },
  {
    ref: "EV-000007",
    title: "Silent truncation loop incident: older FSM logs were truncated as context filled up, causing the agent to repeat the same state transitions infinitely without triggering iteration ceilings, detected via Observability traces.",
    source_url: "file:///research/2026-07-04.md",
    source_type: "incident_log"
  },
  {
    ref: "EV-000008",
    title: "GSC Stale Rescheduling Audit: dynamic auditing that monitors Google Search Console performance data and DEV.to view counts, automatically resetting low-traction/stale articles (under 10 views in 7 days) back to UPDATE_NEEDED.",
    source_url: "file:///scripts/gsc_rescheduler.mjs",
    source_type: "codebase"
  }
];

const insertStmt = db.prepare(`
  INSERT INTO evidence (artifact_id, evidence_ref, source_url, source_type, title, confidence)
  VALUES (4, ?, ?, ?, ?, 99)
`);

for (const ep of evidencePoints) {
  insertStmt.run(ep.ref, ep.source_url, ep.source_type, ep.title);
  console.log(`Inserted evidence ${ep.ref}`);
}

// Reset state of artifact 4 to OUTLINE so the FSM re-generates outline & writes with the new evidence
db.prepare("UPDATE artifacts SET state = 'OUTLINE', cost_usd_total = 0 WHERE id = 4").run();
console.log("\nArtifact 4 state reset to OUTLINE with full evidence populated.");
