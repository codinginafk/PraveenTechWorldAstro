import Database from 'better-sqlite3';
const db = new Database('./mission_control.sqlite');

const evidence = [
  {
    ref: "EV-000001",
    url: "internal-knowledge",
    title: "The $200 Runaway Agent Incident",
    content: "In a production system using LangChain, an agent got stuck in a loop between a 'Search' tool and a 'Python Execution' tool. Because it kept encountering a SyntaxError but 'fixing' it with the same invalid code, it ran 150 times in 3 minutes. The lack of an explicit circuit breaker or max_iterations limit resulted in a massive spike in OpenRouter costs. The fix was implementing a strict iteration limiter and a token budget per request."
  },
  {
    ref: "EV-000002",
    url: "internal-knowledge",
    title: "Circuit Breaker Implementation",
    content: "A standard try/catch is insufficient for agents. A Circuit Breaker pattern is required. This involves tracking consecutive failures or iterations. If `iterations > MAX_ITERS`, the system transitions to a 'FAILED' state and halts. In code, this looks like a loop invariant that throws a 'CircuitBreakerError' which is caught by the orchestration layer, preventing the agent from autonomously choosing to 'try again'."
  },
  {
    ref: "EV-000003",
    url: "internal-knowledge",
    title: "Observability and Telemetry",
    content: "You cannot debug runaway agents using standard console.log. Telemetry tools like Langfuse, Helicone, or Braintrust are required to track intermediate steps (tool calls, reasoning traces). We implemented a custom dashboard that flags any agent executing more than 5 tool calls per minute as 'anomalous'. This alerting setup enables preemptive termination of runaway pipelines."
  }
];

const insert = db.prepare("INSERT INTO evidence (artifact_id, evidence_ref, source_url, title, content_hash) VALUES (?, ?, ?, ?, ?)");

for (const e of evidence) {
  insert.run(2, e.ref, e.url, e.title, e.content);
}

console.log("Evidence injected into mission_control.sqlite");
// Transition artifact back to OUTLINE to restart the generation
db.prepare("UPDATE artifacts SET state = 'OUTLINE', consecutive_failures = 0 WHERE id = 2").run();
console.log("Artifact 2 reset to OUTLINE state.");
