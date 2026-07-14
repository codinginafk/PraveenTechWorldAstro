# assertGraphClosure

**Catch dead-end states in your finite state machine before they freeze production.**

Zero dependencies. One function. Node 18+.

## The bug this exists because of

We built a "safety net" for an AI agent pipeline: if an article failed review
too many times, route it to `UPDATE_NEEDED` or `NEEDS_HUMAN_REVIEW` instead of
looping forever.

It worked exactly as designed — and froze the entire pipeline anyway.

Neither `UPDATE_NEEDED` nor `NEEDS_HUMAN_REVIEW` had any outbound transitions.
The safety net caught the infinite loop, then became a dead end itself. Every
artifact that hit it was stuck permanently, and the orchestrator started
throwing `Invalid transition` errors on every subsequent tick.

The full writeup, with the actual broken transition table: *[link to the
Dead-End State Trap article once published]*

This tool is the 10-line check that would have caught it in CI before it ever
shipped.

## What it checks

1. **Dead ends** — every non-terminal state must have at least one outbound
   transition. If it doesn't, whatever enters that state can never leave.
2. **Undefined targets** — every transition must point at a state that
   actually exists somewhere in the table. Catches typos.
3. **Unreachability** (optional) — if you provide an entry state, flags any
   defined state that can never actually be reached. Dead code in your FSM.

## Install

No npm package yet — copy `assertGraphClosure.js` directly into your project,
or clone this repo. (If enough people want it as a real package, open an
issue and I'll publish it.)

## Usage

### As a library

```javascript
import { assertGraphClosure } from "./assertGraphClosure.js";

const transitions = {
  DISCOVERED: ["RESEARCHING"],
  RESEARCHING: ["REVIEWING"],
  REVIEWING: ["READY", "UPDATE_NEEDED"],
  READY: ["PUBLISHED"],
  UPDATE_NEEDED: [], // <-- dead end, will be flagged
};

const result = assertGraphClosure(transitions, {
  entryState: "DISCOVERED",
  terminalStates: ["PUBLISHED"],
});

if (!result.valid) {
  result.errors.forEach((e) => console.error(`[${e.type}] ${e.message}`));
  throw new Error("FSM has structural issues — see above.");
}
```

### As a CI check

```bash
node assertGraphClosure.js path/to/your-transitions.json
```

Config format:
```json
{
  "entryState": "DISCOVERED",
  "terminalStates": ["PUBLISHED"],
  "transitions": {
    "DISCOVERED": ["RESEARCHING"],
    "RESEARCHING": ["REVIEWING"]
  }
}
```

Exit code `0` if the graph is closed, `1` if it finds problems — drop it into
a pre-commit hook or CI pipeline for any FSM-based system (agent
orchestration, workflow engines, approval pipelines, anything with states).

### Try it right now

Two example files are included — the actual broken table from the real bug,
and the fixed version:

```bash
node assertGraphClosure.js example-transitions.json        # fails, shows the real bug
node assertGraphClosure.js example-transitions-fixed.json  # passes
```

## Why this matters more for LLM agent pipelines specifically

Traditional state machines are usually designed by one person who draws the
whole graph up front. LLM agent pipelines tend to grow organically — a new
"safety" state gets bolted on to fix one specific failure mode, without
anyone re-checking the *entire* graph for closure. That's exactly how this
bug happened: the fix for one problem (infinite loops) silently created a
worse one (permanent freezes), because nobody checked whether the new states
had exits.

If you're building any kind of agentic pipeline with states like
`RESEARCHING`, `REVIEWING`, `NEEDS_HUMAN_REVIEW`, etc. — run this against
your transition table before you find out about a dead end in production.

## License

MIT — use it, fork it, no attribution required (though a link back is always
appreciated).

## Author

Built by Praveen, documenting real production infrastructure work at
[praveentechworld.com](https://praveentechworld.com) — IT Operations Lead
running enterprise infrastructure for 700+ users across 35+ branches,
currently building an AI content orchestration system and writing up what
actually breaks along the way.
