# PTW Local Control System integration

`C:\Users\bunny\Downloads\00Resume\PTW_Local_Control_System_v2` is the canonical separate local control plane for agent task ownership, isolated workspaces, submissions, approvals, recovery refs, and audit history. It must stay outside this Git repository. This repository owns the website code/content; PTW owns the coordination ledger. PTW's runtime, SQLite database, hub, agent clones, and backups should remain inside that folder by default; no `E:` drive is required.

## Authority boundaries

| Concern | Source of truth |
| --- | --- |
| Website code, content, configuration, and deployment history | This repository and Git |
| Cross-harness handoff and decisions | `docs/project-memory/current.json` and `events.jsonl` |
| Content-pipeline quotas, evidence freshness, and syndication state | `research/agents/state.json` |
| Agent claims, leases, isolated clones, submissions, approvals, recovery, and reconciliation | PTW v2 SQLite/Git runtime |
| Growth OS activation | The versioned Growth OS design documents; it remains OFF until their activation gates pass |

Do not treat PTW's SQLite history as a replacement for repository memory, and do not treat a natural-language PTW note as proof that a file changed. Git state and the repository's validation gates remain authoritative.

## Configure a harness context lookup

The bridge defaults to the canonical folder above when it exists. Set it explicitly in the shell used by the harness when you want the configuration to be obvious:

```powershell
$env:PTW_CONTROL_ROOT = "C:\Users\bunny\Downloads\00Resume\PTW_Local_Control_System_v2"
node scripts/ptw-context.mjs --agent codex --task PTW-0142
```

The command combines PTW context with the repository handoff snapshot, content-pipeline state, and current Git status. Use `--require-control` for a governed agent task that must stop if PTW is not configured:

```powershell
node scripts/ptw-context.mjs --agent codex --task PTW-0142 --require-control
```

If PTW is not initialized, the command still returns the repository context and reports the PTW error; it never invents PTW state. Keep the backup path local to the canonical PTW folder, for example `C:\Users\bunny\Downloads\00Resume\PTW_Local_Control_System_v2\backups`.

## Safe operating sequence

1. Read `.agents/AGENTS.md`, `.agents/SYSTEM_DIRECTIVE.md`, the applicable `.agents/rules/` file, and `docs/project-memory/current.json`.
2. Run the context command above and confirm the PTW task, goal, agent, and isolated workspace. All PTW operational data should resolve under the canonical `00Resume\PTW_Local_Control_System_v2` folder.
3. Work only in the claimed PTW clone. Record important reasoning with `ptw.py note` and keep evidence labelled as observed, sourced, provisional, or proposed.
4. Run the repository validation gates. A PTW `PASS` is not a substitute for `npm run validate-content`, internal-link checks, or the Astro build.
5. Commit in the agent clone and submit through PTW. Do not merge accepted main from an agent clone.
6. After human approval and PTW merge, sync the human checkout and push to the GitHub remote deliberately. PTW's local hub does not automatically govern or update GitHub's remote branch.
7. Record the cross-harness handoff when the work is complete or paused with `node scripts/project-memory.mjs handoff`, including the exact files and verification status.

`npm run build` is intentionally verification-only. It must not publish drafts, regenerate tracked release files, or notify search engines. `npm run release-prep` and `npm run notify-indexnow` are explicit release actions for the human-approved release path; do not run them from an agent clone or a scheduled review.

## Project-specific constraints

The website rules are stricter than the generic PTW protocol where they conflict:

- Only one article may be made live in a release session. Other article work remains draft-only.
- Scheduled content jobs are read-only review/report jobs. They must not change `draft`, commit, push, deploy, syndicate, or submit URLs.
- Never delete, rename, or replace content/assets as part of scheduled work.
- Do not activate Growth OS `MANAGED` or `BOUNDED` mode. The existing Growth OS design still requires a tested ledger, source adapters, idempotency, approval, rollback, and a dry run.
- Proposed, community, or AI-generated evidence must not be described as locally tested.

## v2.0.1 hardening status

The supplied PTW package has been hardened in place without deleting existing files:

- claims now use a SQLite write transaction and compare-and-set ownership update;
- merge preparation is serialized and failed merge attempts remain auditable;
- initialization/upgrade creates the local backup directory, backup names include microseconds, and backup creation stops at the size/free-space safety floor without automatic deletion;
- reconciliation and `doctor` surface origin/main drift without resetting either repository;
- the project guard blocks more than one article draft-to-live transition and blocks reintroducing a mutating scheduled workflow.

The remaining boundary is intentional: the dashboard binds to `127.0.0.1`. Do not change it to a network interface without adding authentication and a single-instance/access-control design first. PTW still cannot defend against a malicious process running as the same Windows user.
