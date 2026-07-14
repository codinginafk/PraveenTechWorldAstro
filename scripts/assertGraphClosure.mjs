/**
 * scripts/assertGraphClosure.mjs
 * ---------------------------------------------------------------------------
 * Validates a finite state machine's transition table for structural bugs.
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

export { assertGraphClosure };
