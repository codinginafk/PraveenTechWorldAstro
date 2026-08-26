# GSC striking-distance audit — 26 August 2026

## Measurement rules

- Property: `sc-domain:praveentechworld.com`
- Window: 25 July–23 August 2026 (30 days)
- Trailing lag excluded: 3 days
- Search Console state: `final`
- Dimensions: page + query
- Filter: at least 10 impressions, average position 4–20
- Query/page rows exclude anonymized queries, so this is an opportunity report rather than a site-total report.

The priority score used by the report is `impressions / average position`. It is only a transparent sorting heuristic; it is not a traffic or CTR forecast.

## Highest-value opportunities

| Page | Query | Impressions | Clicks | CTR | Avg. position | Decision |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| KB5121003 / inpoutx64 | `inpoutx64` | 99 | 0 | 0% | 9.2 | Keep the Microsoft workaround prominent and improve the title/snippet around the exact driver name. |
| KB5121003 / inpoutx64 | `kb5121003` | 86 | 0 | 0% | 8.5 | Add the update number and game-crash intent to headings and related links. |
| Volume control | `windows 11 volume control not working` | 45 | 0 | 0% | 7.6 | Lead with the human symptom and preserve the safe audio-service test. |
| KB5121003 / inpoutx64 | `windows 11 update kb5121003 causes game crashes and other system errors` | 45 | 0 | 0% | 9.8 | Answer the update-plus-game symptom directly before background detail. |
| Volume control | `volume slider not working windows 11` | 39 | 0 | 0% | 7.0 | Keep “slider” in the title/lede and distinguish a frozen slider from no audio. |
| Reset Windows | `does reinstalling windows remove viruses` | 38 | 0 | 0% | 7.5 | Keep the direct answer, then qualify reset type, backups, and Defender Offline limits. |
| NVLDDMKM | `nvlddmkm` | 57 | 0 | 0% | 14.0 | Clarify that Event ID 13 is a diagnostic clue, not proof that the GPU is dead. |
| NVLDDMKM | `nvlddmkm event id 13` | 37 | 0 | 0% | 6.8 | Move the event-log interpretation and safe driver workflow higher. |
| CLOCK_WATCHDOG_TIMEOUT | `clock_watchdog_timeout (0x101)` | 40 | 1 | 2.5% | 9.6 | Use the revised, non-diagnostic language and test sequence rather than a single-root-cause claim. |
| KMODE | `0x1e` | 42 | 0 | 0% | 9.7 | Keep as a supporting Windows BSOD cluster page; do not cannibalize the 0x101 intent. |

The DeepSeek 8GB page had no rows meeting this filter in the same final window. It can still support the AI pillar, but it should not be treated as one of this month’s proven search winners without new data.

## Work completed from this audit

1. Added the reusable `scripts/gsc_striking_distance.mjs` report with honest date-window labeling, Search Console lag handling, URL normalization, final data, and a larger row limit.
2. Replaced the volume article’s one-line command that also killed Explorer with two reversible audio-service restarts.
3. Tightened the 0x101 article so Parameter 4 and hardware causes are treated as evidence to test, not a guaranteed diagnosis.
4. Added contextual links from the KB5121003 guide to the CVE and SPLWOW64 troubleshooting paths, and from the August roundup to the detailed KB guide.
5. Added the quantization guide to the DeepSeek article and corrected malformed fenced-code closers.
6. Qualified the password-manager passkey and pricing language without presenting dynamic vendor prices as permanent facts.
7. Added a content-validation gate to the scheduled publisher so invalid frontmatter cannot be committed automatically.

## Next measurement checkpoint

Run the same report after another complete 30-day final-data window. Compare impressions, clicks, CTR, and average position by page/query; do not judge a title change from the first few incomplete days.
