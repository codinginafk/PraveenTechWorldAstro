/**
 * assertGraphClosure.js
 * ---------------------------------------------------------------------------
 * Validates a finite state machine's transition table for two real,
 * production-breaking bug classes:
 *
 *   1. DEAD_END   — a non-terminal state with no outbound transitions.
 *                   Artifacts/entities can enter it but never leave.
 *   2. UNDEFINED_TARGET — a transition points at a state that doesn't exist
 *                   anywhere else in the table (almost always a typo).
 *   3. UNREACHABLE — (optional, if you provide an entryState) a state that's
 *                   defined but can never actually be reached. Dead code.
 *
 * This exists because of a real bug: a "safety" fix meant to stop an
 * infinite loop routed failing states into UPDATE_NEEDED and
 * NEEDS_HUMAN_REVIEW — and neither of those states had any way back out.
 * The fix for the infinite loop silently became a permanent freeze instead.
 * See example-transitions.json for the exact broken table that caused it.
 */

function assertGraphClosure(transitions, options = {}) {
  const { terminalStates = [], entryState } = options;
  const errors = [];
  const allStates = Object.keys(transitions);
  const allTargets = new Set();

  // Check 1: every non-terminal state needs at least one way out
  for (const state of allStates) {
    const outbound = transitions[state];
    if (!terminalStates.includes(state)) {
      if (!Array.isArray(outbound) || outbound.length === 0) {
        errors.push({
          type: "DEAD_END",
          state,
          message: `State "${state}" has no outbound transitions and is not listed as terminal. ` +
            `This is the dead-end trap: things can enter this state but never leave it.`,
        });
      }
    }
    (outbound || []).forEach((t) => allTargets.add(t));
  }

  // Check 2: every referenced target must actually be defined somewhere
  for (const target of allTargets) {
    if (!allStates.includes(target) && !terminalStates.includes(target)) {
      errors.push({
        type: "UNDEFINED_TARGET",
        state: target,
        message: `A transition points to "${target}", which isn't defined anywhere in the table. Likely a typo.`,
      });
    }
  }

  // Check 3 (optional): reachability from a given entry point
  if (entryState) {
    const reachable = new Set([entryState]);
    const queue = [entryState];
    while (queue.length) {
      const current = queue.shift();
      for (const next of transitions[current] || []) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }
    for (const state of allStates) {
      if (!reachable.has(state)) {
        errors.push({
          type: "UNREACHABLE",
          state,
          message: `State "${state}" is defined but can never be reached from entry state "${entryState}". Dead code in your FSM.`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---- CLI ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import("node:fs");
  const configPath = process.argv[2];

  if (!configPath) {
    console.log("Usage: node assertGraphClosure.js <path-to-config.json>");
    console.log("Config format: { \"transitions\": {...}, \"entryState\": \"...\", \"terminalStates\": [...] }");
    console.log("Try: node assertGraphClosure.js example-transitions.json");
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const result = assertGraphClosure(config.transitions, {
    entryState: config.entryState,
    terminalStates: config.terminalStates || [],
  });

  if (result.valid) {
    console.log("✅ Transition graph is closed: every non-terminal state has a way out, no undefined targets, all states reachable.");
    process.exit(0);
  } else {
    console.error(`❌ Found ${result.errors.length} issue(s):\n`);
    result.errors.forEach((e) => console.error(`  [${e.type}] ${e.message}`));
    process.exit(1);
  }
}

export { assertGraphClosure };
