# Archive — retired scripts

These files are kept for reference only. **Nothing here is run by `npm run build`,
by CI, or by any other script in the repository.**

## Why they were retired

The repo had accumulated ~79 loose scripts in `scripts/` plus 19 at the root. Most
were one-off migrations or experiments from earlier sprints. They were not wired
into `package.json`, the GitHub Actions workflows, or each other, so they only
added noise: an agent or engineer reading the tree could not tell which scripts
mattered, and two of them (`ptw_gsc_ctr_watchdog.py`, `guest_post_worker.js`) looked
like production automation while nothing ever invoked them.

Every file in here was verified to have **no** reference from:

- `package.json` scripts
- `.github/workflows/*.yml`
- any `import` / `require` / `execSync` / `fork` in the remaining tree
- `docs/`, `.agents/AGENTS.md` or other project documentation

## What moved

| Directory | Count | Examples |
| --- | --- | --- |
| `root-scripts/` | 14 | `add_links_v3.mjs`, `fix_citations.mjs`, `validate_spoke2.mjs` |
| `scripts/` | 46 | `cluster_manager.mjs`, `content_writer.mjs`, `rie_*.mjs`, `ptw_*_watchdog.py` |

`patch-gsc-404.mjs` is here because its job is finished: it appended rules to
`public/_redirects`, and that file was removed when `vercel.json` became the single
redirect source.

## If you need one of these again

```bash
git mv archive/scripts/<file> scripts/<file>
```

Check first that its relative imports still resolve — files were moved without
rewriting their `../scripts/...` import paths.

## The scripts that remain in `scripts/`

Only tools that something actually calls: `scoutdb.mjs`, `mission_control.mjs`,
`seo_memory.mjs`, `syndicator.mjs`, `ci_failure_notifier.mjs`, `ptw-context.mjs`,
`system_health_monitor.mjs`, `ctr_title_optimizer.mjs`, `seo_intel_scout.mjs`,
`project-memory.mjs`, `serp_keyword_optimizer.py`, `gsc_striking_distance.mjs`,
`hallucination_auditor.mjs`, `seo_rl_ledger.mjs`, `verify_redirects.py` and the
`seo-agent/` pipeline used by `npm run seo-audit`.
