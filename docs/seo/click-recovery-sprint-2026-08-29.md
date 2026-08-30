# Click recovery sprint — 2026-08-29

## Purpose

Recover qualified search clicks by improving pages that already receive impressions, while keeping the URL set stable and validating the release before expanding the content count.

## Measurement discrepancy

The configured Google Search Console domain property does not currently reproduce the reported "under 80 clicks in the last 28 days" view.

- Latest complete API window: 2026-07-30 through 2026-08-26 — 153 clicks, 22,653 impressions, 0.68% CTR.
- Latest complete 7-day window: 2026-08-20 through 2026-08-26 — 70 clicks, 7,326 impressions, 0.96% CTR.
- Previous complete 7-day window: 2026-08-13 through 2026-08-19 — 69 clicks, 7,046 impressions, 0.98% CTR.

These API results are evidence of a reporting mismatch, not proof that the user-facing GSC view is wrong. Before changing strategy again, reconcile the property, date range, search type, country/device filters, and whether the dashboard is using stale imported data. Bing could not be fetched because the configured API key returned `InvalidApiKey`.

## Highest-impact page signals

The latest complete GSC window contains several page-one or near-page-one opportunities with weak click-through:

| Page | Impressions | Average position | Clicks |
| --- | ---: | ---: | ---: |
| PC keeps crashing: RAM vs. driver | 362 | 10.6 | 0 |
| Best free VPNs | 544 | 11.7 | 0 |
| KMODE 0x1E | 321 | 11.0 | 1 |
| Windows 11 volume slider | 306 | 6.7 | 2 |
| nvlddmkm Event ID 13 | 313 | 12.2 | 2 |
| Factory reset and viruses | 741 | 11.8 | 2 |

## Changes made locally

- Refreshed the PC-crash title, description, opening, query mapping, and Problem Record.
- Refreshed the KMODE 0x1E title, description, query mapping, and Problem Record.
- Refreshed the free-VPN title, description, opening, query mapping, and Problem Record.
- Added BIOS/firmware warning and rollback guidance plus an in-body Microsoft reference to the PC-crash page after the v5 safety gate detected an issue.
- Removed the package build step that copied `sitemap-0.xml` to `sitemap.xml`.

## Validation

- 138 article frontmatter files passed validation.
- No duplicate article titles.
- All 138 articles have valid cover images.
- `astro check`: 0 errors, 0 warnings, 0 hints.
- Astro build passed and generated 518 pages.
- Build now emits only `sitemap-index.xml` and `sitemap-0.xml`; `robots.txt` advertises only `sitemap-0.xml`.
- v5 SEO checks: PC 87.8 REVIEW / 0 FAIL; KMODE 89.1 REVIEW / 0 FAIL; free VPN 85.4 REVIEW / 0 FAIL.

## Release gate

The changes are still in the site working tree. Human review, commit/push/deploy, live sitemap verification in GSC and Bing, and a matching 7–14 day post-release measurement window remain before closing the v5 tasks or claiming recovery.
