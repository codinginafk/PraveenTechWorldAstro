# Traffic-leader refresh — 2026-08-24

## Decision

The KB5121003 / inpoutx64 article was the highest-click page in the latest complete GSC week (34 clicks, 1,688 impressions, average position 8.26). It was refreshed in place because the page already had search traction and its subject was still supported by a live Microsoft release note.

## Changes

- Replaced unsupported first-person incident claims with facts from Microsoft’s KB5121003 release notes.
- Documented the named symptoms, affected games, RGB/peripheral context, registry backup, reversible `Start=4` workaround, restoration path, and Feedback Hub reporting checklist.
- Removed unsafe driver-deletion instructions and warned against guessing at similarly named services.
- Added contextual links to Windows update, GPU, BSOD, and Secure Boot troubleshooting pages.
- Added `src/content/hubs/windows-troubleshooting.mdx` so the Windows-fixes pillar has a hub.

## Validation

- Direct Astro production build passed: 509 pages, Pagefind indexed 570 pages.
- Article quality gate score: 75. Remaining failures are readability, paragraph-length heuristics, local-image URL convention, and the gate’s original-data requirement; no frontmatter or link-resolution failure remains.
- No deployment, syndication, Reddit posting, or automated claims were made.

## Next measurement

Wait for recrawl, then compare the page’s 7-day clicks, impressions, CTR, and average position against the 34-click / 1,688-impression baseline. Only change the title or description again if CTR remains weak at a stable position.
