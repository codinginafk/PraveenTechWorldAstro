# Project memory

This folder is the cross-harness handoff surface for PraveenTechWorld.

It is deliberately repository-owned and text-first so Codex, Claude Code, Cursor, OpenCode, and local scripts can all use it without a hosted account or a second database service.

## Files

- `current.json` — the compact, current snapshot. Read this before starting work.
- `events.jsonl` — append-only handoff and decision events. Do not rewrite old events.
- `README.md` — the contract and update rules.

The repository remains the source of truth for code and content. `research/agents/state.json` remains the source of truth for the content pipeline. This layer records what a harness did, what is unfinished, and what the next harness should do.

## CLI

```text
node scripts/project-memory.mjs status
node scripts/project-memory.mjs handoff --summary "..." --next "..." --files "file-a,file-b"
node scripts/project-memory.mjs decision --summary "..." --reason "..."
```

Use paths relative to the repository. Keep summaries factual and short. Never put secrets, API keys, or full conversation transcripts in this folder.

## Handoff contract

Every completed or paused task should record:

1. what changed;
2. what remains;
3. the exact files involved;
4. verification performed and failures;
5. the next safe action;
6. whether human approval is required.

The snapshot is intentionally small. Older detail belongs in the append-only event log or in the task-specific report under `research/agents/reports/`.
