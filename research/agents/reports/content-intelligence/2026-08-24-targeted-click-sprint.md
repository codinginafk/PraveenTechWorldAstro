# Targeted click sprint — 2026-08-24

Status: edited locally, not published, not syndicated, not committed.

## Objective

Improve three pages already receiving search impressions, while removing unsupported claims and preserving their existing URLs. Position 1–2 is the optimization target, not a guarantee; ranking still depends on competitors, links, intent match, and future Google/Bing re-crawls.

## GSC opportunity snapshot

The read-only GSC report compared the two most recent complete weeks (2026-08-08–14 vs 2026-08-15–21, using a three-day data lag):

| URL | Current impressions | Current clicks | CTR | Avg. position | Decision |
|---|---:|---:|---:|---:|---|
| `/blog/does-resetting-windows-remove-viruses-completely` | 932 | 0 | 0.00% | 9.90 | Rewrite for intent and trust |
| `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11` | 476 | 1 | 0.21% | 11.79 | Rewrite title, answer, and diagnostic workflow |
| `/blog/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen` | 249 | 2 | 0.80% | 9.10 | Rewrite unsupported update claims and strengthen diagnosis |

The site-wide comparison moved from 15 clicks / 4,489 impressions (prior complete week) to 102 clicks / 8,921 impressions (current complete week). The KB5121003 page already produced 34 clicks at position 8.26, so it was deliberately left untouched in this sprint to avoid disturbing a page that is already a traffic driver.

## Changes made

### Does resetting Windows remove viruses?

- Removed fabricated malware samples, percentages, “bench team” results, and guarantees.
- Reframed the page around Microsoft’s documented **Keep my files**, **Remove everything**, **Cloud download**, Defender Offline, and installation-media choices.
- Added account-protection, backup hygiene, external-drive, firmware-boundary, and post-reset steps.
- Added inline Microsoft citations and kept related internal links.
- Updated `updatedDate` to 2026-08-24; kept the slug unchanged.

### nvlddmkm.sys Event ID 13

- Removed the invented client-workstation story and unsupported Event ID 13/14 certainty claims.
- Removed the normal-user recommendation to set `TdrDelay`/`TdrDdiDelay`; Microsoft documents those keys for driver development/testing and says end users should not manipulate them.
- Added an evidence-first path: Event Viewer capture, supported driver update/rollback, DDU as a second-line cleanup, stock clocks, temperature/power checks, RAM/WHEA/PCIe comparisons, and escalation criteria.
- Changed the invalid `hardware-troubleshooting` category to the existing `windows-fixes` pillar.
- Added official Microsoft/NVIDIA/Wagnardsoft citations and kept/expanded contextual internal links.
- Updated `updatedDate` to 2026-08-24; kept the slug unchanged.

### KMODE_EXCEPTION_NOT_HANDLED (0x1E)

- Removed unsupported “80%” statistics, invented repair-bench observations, and unverified Dell/Alienware KB-number claims.
- Rebuilt the page around Microsoft’s Bug Check 0x1E definition, dump capture, WinDbg `!analyze -v`, driver rollback, stock-memory testing, Fast Startup comparison, DISM/SFC, WHEA/storage/firmware checks, and cautious Driver Verifier use.
- Added inline Microsoft citations and a third contextual internal link.
- Updated `updatedDate` to 2026-08-24; kept the slug unchanged.

## Google Flow image briefs

Use Google Flow for the final raster assets. Do not put text, UI labels, logos, or fake benchmark numbers in the image. Export a 16:9 hero crop (approximately 1200×675) plus a square social crop, and keep the visual language consistent across the three pages.

1. **Windows reset and malware:** “Editorial technology illustration, an open Windows laptop beside a reset/recovery screen represented only by abstract circular arrows, a separate clean USB drive, and a small security shield. Off-white background, restrained navy/teal/amber palette, realistic but clean human newsroom art direction, soft directional light, no readable text, no logos, no malware brand names, no horror imagery, 16:9 hero composition with safe space for a headline.”
2. **nvlddmkm Event ID 13:** “Editorial close-up of a desktop graphics card with a broken signal path that reconnects through a diagnostic checklist represented by simple colored nodes; subtle heat shimmer near the GPU and a power cable visible. Off-white background, navy/teal/amber palette, technically plausible hardware, no readable text, no logos, no fake error codes, 16:9 hero composition.”
3. **KMODE 0x1E:** “Editorial illustration of a computer kernel as a layered processor-and-memory diagram with one highlighted fault path leading to a blue-screen warning symbol; include a minidump file icon as an abstract shape, not readable text. Off-white background, navy/teal/amber palette, calm diagnostic mood, no logos, no fake Windows UI, 16:9 hero composition.”

## Validation and blockers

- The quality-gates runner now executes after a one-line pre-existing `rawContent` bug fix in `research/agents/lib/quality-gates.mjs`.
- Scores after the rewrite: malware 50/100, nvlddmkm 50/100, KMODE 65/100. Remaining failures are mainly the project’s stale gates: it demands “original testing data” even when evidence rules prohibit invented tests, expects a missing `windows-troubleshooting` hub, rejects technical readability above grade 11, and has normalized-keyword/title heuristics that do not understand punctuation such as `nvlddmkm.sys`.
- `npm.cmd run check` and a direct Astro build both stop on an unrelated existing collection error in `deepseek-r1-quantization-fp8-q4-local-vram-guide.mdx` (description over 165 characters and references missing required titles). No error was reported against these three edited files before collection sync aborted.
- No publish, commit, push, Reddit post, or syndication was performed. Review the drafts and Flow assets first, then publish through the existing approval workflow.

## Next measurement window

After publication, request re-crawls and compare these URLs after 7, 14, and 28 days. Track impressions, CTR, average position, query mix, and Bing clicks separately. If a page gains impressions but remains below 3% CTR at positions 5–12, test only the title/description first; do not rewrite the body again until the next complete-week comparison.
