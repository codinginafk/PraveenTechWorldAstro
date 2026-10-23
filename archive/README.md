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

## `tools/`

### `critical-css.mjs` — evaluated, **not shipped**

Extracts the above-the-fold rules from the compiled stylesheet and inlines them,
deferring the rest. Built and measured, but deliberately **not wired into the
build**: the extraction cannot be made pixel-exact from static HTML alone.

Measured on the real 640-page build, with the stylesheet request blocked and the
result compared pixel-by-pixel against the fully styled render, at 390×844 and
1280×900:

| Approach | Inline size | Page/viewport combos identical |
| --- | --- | --- |
| string heuristic (header + N chars of `<main>`) | 26.5 KB | 0 / 12 |
| + fixed/sticky subtrees for the consent banner | 37.7 KB | 0 / 12 |
| + class set derived from Chromium layout | 39.4 KB | 11 / 12 |
| + union of both, across 12 diverse pages | 40.8 KB | 19 / 24 |

The residual failures were real layout breakage, not rounding: an "Updated" badge
SVG rendered at ~200 px because `h-3 w-3` was not inlined for one particular
article, and the hero image overflowed an article page where `w-full` was missed.
Neither is detectable from markup alone — "what is in the first viewport" is a
layout question, and per-page variance means one snapshot per template is not
enough either.

Wire cost if shipped: ~6 KB brotli of inline CSS on every page (uncacheable) to
save one ~150 ms blocking round trip. Worth it only when the render is exact.

To resume: per-page extraction inside a real layout engine at build time, or
hand-maintained per-template critical CSS with a render-parity test as the gate.

## The scripts that remain in `scripts/`

Only tools that something actually calls: `scoutdb.mjs`, `mission_control.mjs`,
`seo_memory.mjs`, `syndicator.mjs`, `ci_failure_notifier.mjs`, `ptw-context.mjs`,
`system_health_monitor.mjs`, `ctr_title_optimizer.mjs`, `seo_intel_scout.mjs`,
`project-memory.mjs`, `serp_keyword_optimizer.py`, `gsc_striking_distance.mjs`,
`hallucination_auditor.mjs`, `seo_rl_ledger.mjs`, `verify_redirects.py` and the
`seo-agent/` pipeline used by `npm run seo-audit`.
