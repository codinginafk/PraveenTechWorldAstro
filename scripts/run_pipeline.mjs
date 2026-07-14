import { runTick, db } from './mission_control.mjs';

async function runUntilStable() {
  console.log("Starting pipeline execution loop...");
  while (true) {
    const inFlight = db.prepare(
      `SELECT * FROM artifacts WHERE state NOT IN ('NEEDS_HUMAN_REVIEW', 'UPDATE_NEEDED', 'MONITORING', 'READY', 'PUBLISHED')`
    ).all();
    
    if (inFlight.length === 0) {
      console.log("No in-flight artifacts left. Pipeline execution finished.");
      break;
    }
    
    console.log(`\nFound ${inFlight.length} in-flight artifacts. Running a tick...`);
    for (const artifact of inFlight) {
      console.log(`- Artifact ID: ${artifact.id} | Current State: ${artifact.state} | Topic: ${artifact.topic}`);
    }
    
    await runTick();
    
    // Wait a brief moment before the next tick
    await new Promise(r => setTimeout(r, 2000));
  }
}

runUntilStable().catch(console.error);
