---
title: PTW local control integration
description: Coordinate the external PTW Local Control System v2 with the repository-owned handoff and content pipeline without creating a second source of truth.
activation: always_on
---

# PTW local control integration

The bridge automatically uses the canonical sibling directory `C:\Users\bunny\Downloads\00Resume\PTW_Local_Control_System_v2` when it exists. An explicit `PTW_CONTROL_ROOT` may override that path. Load the combined context before governed work:

```powershell
node scripts/ptw-context.mjs --agent <agent-id> --task <task-id> --require-control
```

PTW v2 governs claims, isolated agent clones, submissions, approvals, recovery, and coordination events. It does not replace Git, `docs/project-memory/current.json`, or `research/agents/state.json`.

Follow the stricter repository rules when PTW and the repo differ:

- one article maximum may be made live in a release session;
- scheduled content jobs are report-only and read-only;
- no scheduled deletion, replacement, commit, push, deployment, syndication, or URL submission;
- proposed or community evidence is not locally tested evidence;
- Growth OS remains OFF until its versioned activation gates are passed.

Before handing work to another harness, record a factual project-memory handoff with the exact files and verification status. A PTW note explains reasoning; it does not prove a Git or test result.
