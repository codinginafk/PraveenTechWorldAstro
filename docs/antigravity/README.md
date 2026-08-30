# Antigravity content-intelligence setup

This package gives Google Antigravity one scheduled heartbeat and one workspace workflow for PraveenTechWorld. The heartbeat starts every 30 minutes, while the workflow itself enforces slower data cadences: community scans every six hours, search snapshots daily, decisions weekly, and reviews monthly.

## Why this is separate from the current orchestrator

Do not schedule `node research/agents/orchestrator.mjs`. Its current code sets `MANUAL_APPROVAL_REQUIRED = false` and contains paths that move/delete drafts, commit, push, publish, and syndicate. That conflicts with `.agents/AGENTS.md` and `.agents/SYSTEM_DIRECTIVE.md`.

Other gaps this workflow compensates for:

- `src/scripts/gsc-weekly-ranking-tracker.mjs` labels itself weekly but reads one rolling 28-day window and does not compare it with a prior window.
- The existing GSC code includes the current date, which can introduce incomplete recent data.
- `research/agents/state.json` contains old sprint and performance timestamps mixed with newer submission timestamps, so freshness must be checked per field.
- Bing code currently mixes analytics with submission actions. This workflow permits read-only analytics and forbids submissions.
- Reddit discovery currently relies mainly on `hot.json`; this workflow requires recurrence, dates, independent discussions, and primary-source verification.
- Workspace voice rules conflict between team voice and single-person voice. The workflow permits first-person claims only when repository evidence proves them.

## Install in Antigravity 2.0

Antigravity discovers sidecars under `%USERPROFILE%\.gemini\config\sidecars\` on Windows. Copy this directory:

`docs\antigravity\sidecars\ptw-content-intelligence`

to:

`%USERPROFILE%\.gemini\config\sidecars\ptw-content-intelligence`

Then merge this entry into `%USERPROFILE%\.gemini\config\config.json` without removing existing settings:

```json
{
  "sidecars": {
    "ptw-content-intelligence": {
      "enabled": true,
      "projectId": "YOUR_PRAVEENTECHWORLD_ANTIGRAVITY_PROJECT_ID"
    }
  }
}
```

Restart Antigravity and verify that "PTW Content Intelligence" is enabled. The cron expression is:

```text
*/30 * * * *
```

The project must include this repository so the scheduled conversation can read `.agents/workflows/ptw-content-intelligence.md`.

## UI alternative

In Antigravity 2.0, create a Scheduled Task for the PraveenTechWorld project, choose every 30 minutes, and paste:

```text
Run the workspace workflow in .agents/workflows/ptw-content-intelligence.md. Treat this as a 30-minute heartbeat: obey cooldowns, do not invoke research/agents/orchestrator.mjs, and never publish, deploy, commit, push, syndicate, delete, or overwrite assets. Return the report path and final status.
```

## Expected behavior

Most heartbeats should return `NO_ACTION`. A weekly run may edit at most three existing articles or create exactly one new draft. It cannot do both. Every substantive run produces an append-only report under `research/agents/reports/content-intelligence/` and stops before publication for human review.

Google Flow is used only when the selected work needs a new image. If Flow requires a login or interaction, Antigravity must leave the exact prompt in the human action queue instead of fabricating or substituting an image.
