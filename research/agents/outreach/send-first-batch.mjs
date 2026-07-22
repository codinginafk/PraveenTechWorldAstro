import "dotenv/config";
import { runBatch } from "./outreach-agent.mjs";

console.log("=== First Outreach Batch ===\n");
// First batch: targets with known emails
const result = await runBatch(5);
console.log(`\nDone: ${JSON.stringify(result)}`);
