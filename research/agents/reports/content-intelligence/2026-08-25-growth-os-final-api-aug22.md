# Growth OS Dry Run — Final GSC API Snapshot

**Run ID:** `dryrun-2026-08-25-gsc-final-aug22`  
**Fetched:** 2026-08-25 13:56 GST  
**Trusted-through:** 2026-08-22  
**Period:** 2026-08-01 through 2026-08-22  
**Mode:** Read-only; no production mutation

## Fetch result

The new read-only fetch used the configured Google service account and the Search Console property `sc-domain:praveentechworld.com` with `dataState: final` and explicit dates.

- Page rows: **159**
- Query rows: **994**
- Page-query rows: **1,068**
- Date-page rows: **1,250**
- Date-query rows: **2,565**
- URL Inspection checks: all tested candidate URLs returned **PASS / Submitted and indexed**.

The earlier pasted page excerpt is not treated as the complete reporting window because its totals differ materially from this final API query.

## Highest-impression pages

| Page | Impressions | Clicks | CTR | Position | Current state |
|---|---:|---:|---:|---:|---|
| Add your website to Google Search | 3,757 | 0 | 0.00% | 59.38 | Hold; updated 2026-08-24 |
| Resetting Windows and viruses | 2,718 | 3 | 0.11% | 9.35 | Hold; updated 2026-08-24 |
| KB5121003 / inpoutx64 crash | 1,697 | 36 | 2.12% | 8.25 | Hold; updated 2026-08-24 |
| Windows 11 volume control | 1,203 | 6 | 0.50% | 8.18 | Hold; updated 2026-08-20 |
| NVLDDMKM Event ID 13 | 563 | 1 | 0.18% | 11.81 | Hold; updated 2026-08-24 |
| DeepSeek R1 on 8 GB VRAM | 446 | 6 | 1.35% | 14.50 | Observe; eligible by age, but mixed low-volume query intent |
| Gemini Spark access | 444 | 16 | 3.60% | 8.10 | Observe; trending article, no expansion decision |
| VPN comparison | 442 | 0 | 0.00% | 11.60 | Observe; outside current Phase-1 wedge |
| PC keeps crashing | 313 | 0 | 0.00% | 10.77 | Observe |
| Clock Watchdog 0x101 | 312 | 7 | 2.24% | 14.94 | Observe; published 2026-08-17 |
| KMODE 0x1E | 300 | 2 | 0.67% | 9.30 | Hold; updated 2026-08-24 |
| Sitemap errors | 292 | 1 | 0.34% | 16.60 | Observe |

## Important query evidence

- **KB5121003:** `inpoutx64` 99 impressions at position 9.19; `kb5121003` 86 impressions at position 8.45; `uninstall kb5121003` 43 impressions at position 10.74.
- **Windows volume:** `windows 11 volume control not working` 44 impressions at position 7.61; `volume slider not working windows 11` 42 impressions at position 8.12.
- **NVLDDMKM:** `nvlddmkm event id 13` 34 impressions at position 6.85; `event id 13` 18 impressions at position 9.06.
- **Clock Watchdog:** `clock_watchdog_timeout (0x101)` 35 impressions at position 9.71; `clock watchdog timeout 0x101` 26 impressions at position 12.19.
- **KMODE:** `0x1e` 35 impressions at position 9.49; `kmode_exception_not_handled (0x1e)` 18 impressions at position 10.94.
- **Google indexing:** many related queries are present, but the page is averaging around positions 43–73 and was updated on August 24.

## Date trend observations

- **KB5121003** produced the strongest verified click volume in the recent daily rows, including 36 clicks across the final window; it was updated August 24, so no follow-up edit is allowed yet.
- **Clock Watchdog** produced 4 clicks on August 21 and 2 on August 22; this is a positive signal, not a reason to rewrite.
- **Windows volume** improved toward approximately position 6 on August 22 after the recent update; hold for measurement.
- **Google indexing** impressions rose into the 100–179/day range while average position improved from roughly 70 toward the high 50s, but the page remains in cooldown after the August 24 update.
- **Reset Windows** moved from roughly position 8–9 toward 12 before improving to about 10.7 on August 22; hold after the August 24 update.

## Decisions

- **Immediate article edits:** 0
- **New articles:** 0
- **New tools:** 0
- **External distribution:** 0
- **Highest-priority future review:** Google indexing page after its cooldown, because it has the largest impression pool but poor ranking/CTR.
- **Highest-priority Windows review:** KB5121003 after its August 24 update cooldown; it already earns clicks and should not be destabilized prematurely.
- **No new topic:** all meaningful clusters map to existing pages.

## Bing status

The local `.env` contains a Bing key, but every read-only Bing API request returned `HTTP 400 / InvalidApiKey`. No Bing API data was merged into this snapshot. The owner-supplied August 22 Bing figures remain the only trusted Bing baseline until the key is replaced or the Webmaster export is provided.

## URL Inspection

The following URLs returned `PASS / Submitted and indexed`:

- Clock Watchdog 0x101
- DISM 0x800F0915
- DeepSeek R1 local
- Google indexing
- Windows reset/malware
- KB5121003
- Windows volume control
- NVLDDMKM Event ID 13
- KMODE 0x1E

## Next review dates

- **2026-08-26:** DISM and Clock Watchdog review.
- **2026-08-27:** volume and password-manager cooldown review.
- **2026-08-31:** pages updated on August 24, especially Google indexing, reset, KB5121003, NVLDDMKM, and KMODE.

## Result

`PASS_WITH_NO_MUTATION`

The fetch mechanism is now precise for GSC final data through an explicit cutoff. The next blocker is Bing credential validity, not the GSC method.

