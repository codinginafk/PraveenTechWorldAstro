# Top-3 Ranking Sprint — 2026-08-28

## Objective

Move existing pages that already earn meaningful Google impressions from the lower first page or near-page-one range into stronger positions. This is a ranking and click-through sprint, not a promise that every URL will reach positions 1–3.

## Baseline used

Source: imported Google Search Console page data for **2026-08-01 through 2026-08-23**, trusted through 2026-08-23.

- 159 page rows
- 133 clicks
- 18,633 impressions
- 0.71% aggregate CTR
- Weighted average position 25.84
- 33 pages with at least one click; 126 pages with zero clicks

The sitewide average is about 5.8 clicks per day across the whole property. It is not a realistic expectation that every article will immediately produce 5–10 clicks per day. The first measurable win is to improve the pages already receiving impressions, then use their winning patterns for new articles.

## Priority pages

| URL | Baseline clicks | Impressions | CTR | Average position | Sprint action |
| --- | ---: | ---: | ---: | ---: | --- |
| `/blog/does-resetting-windows-remove-viruses-completely` | 3 | 2,826 | 0.11% | 9.5 | Human search title, answer-first opening, Problem Record |
| `/blog/windows-11-volume-control-not-working-8-proven-fixes-for-2026` | 6 | 1,246 | 0.48% | 8.1 | Shorter slider-focused title and opening, Problem Record |
| `/blog/how-to-fix-windows-11-kb5121003-inpoutx64-crash` | 38 | 1,720 | 2.21% | 8.2 | Existing title/evidence test; measure after release |
| `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11` | 2 | 629 | 0.32% | 11.8 | Separate Event ID 13 crash-fix intent and title |

The Event ID 153 page is a supporting diagnostic page, not the source of the 629-impression row. Its copy was also corrected because it previously made unsupported claims about HAGS, PCIe negotiation, TDR registry values, and a success percentage.

## Changes made locally

- Added explicit `target_query`, `problem_id`, and `pillarId` support to the content schema where applicable.
- Added canonical PTW Problem Records to the four sprint pages.
- Shortened and humanized the factory-reset and volume-slider titles.
- Reworked the Event ID 13 title so it owns crash-fix intent.
- Reworked the Event ID 153 title so it owns Event Viewer diagnosis intent; this prevents title cannibalization.
- Improved related-article ranking so shared tags and category relevance drive internal links instead of publish order alone.
- Added crawlable “Start with the most common problems” sections to the Windows and hardware guide hubs.
- Stored the current checks and task notes in PTW v5 tasks `PTW-0262`, `PTW-0263`, `PTW-0268`, and `PTW-0269`.

## Measurement contract

1. Release the local changes without changing these URLs.
2. Verify the canonical sitemap and representative URLs in Google Search Console and Bing Webmaster Tools.
3. Do not use IndexNow batch mode; submit only explicit changed URLs under the existing cap.
4. Wait for a comparable 14–28 day window before judging rankings. Search Console data is delayed and daily position is noisy.
5. Compare clicks, impressions, CTR, average position, and query mix for each target page.
6. Keep a title test stable long enough to learn; do not change title, URL, content, links, and schema every few days.

## Next queue

After this release is measured, the next evidence-led candidates are the DeepSeek 8GB page, Clock Watchdog 0x101 page, sitemap-errors page, and the Windows 11 KMODE 0x1E page. They should be refreshed one at a time with query evidence and a Problem Record, not published as a bulk batch.

The operating split remains **safe compounding** (refresh and measure pages already earning impressions) plus **focused acquisition** (one validated WSL2 or Gemini spoke at a time). New topic volume comes after the current pages show which title, answer structure, and internal-link pattern earns better visibility.
