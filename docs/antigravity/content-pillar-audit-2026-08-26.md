# Content pillar audit and next-topic queue

**Date:** 2026-08-26  
**GSC window:** 2026-08-01 through 2026-08-23, trusted through 2026-08-23  
**Purpose:** turn the site's impression data into a balanced, higher-quality content portfolio.

## Portfolio diagnosis

The repository contains 138 article files. The strategic mapping is:

| Pillar | Current articles | Direction |
| --- | ---: | --- |
| Windows and PC troubleshooting | 28 | Increase; this is Phase 1 |
| Local AI and agent workflows | 47 | Slow net-new volume; improve evidence |
| Web, search, and analytics operations | 28 | Consolidate overlapping pages |
| IT operations and security | 20 | Keep selective and source-led |
| Build-in-public, business, and other | 15 | Publish only with real evidence or demand |

The next 20 meaningful publishes or major refreshes should contain approximately 12 Windows/PC pages, 4 local-AI pages, 2 web/search pages, 1 IT/security page, and 1 measured experiment.

## Completed in this batch

- Published the Windows 11 Bluetooth disappearing guide.
- Published the WSL2 no-internet, DNS, and VPN guide.
- Refreshed the reset-Windows-and-malware page for the exact search wording.
- Refreshed the Windows 11 volume-control page and removed unsupported percentages, invented testing claims, and the deprecated MSDT-first path.
- Refreshed the `nvlddmkm.sys` Event ID 13 page for the exact Windows 11 search wording.
- Replaced the stale pillar note with a measurable portfolio and quality model.

## Highest-value existing pages

| URL topic | Impressions | Clicks | Position | Action |
| --- | ---: | ---: | ---: | --- |
| Does resetting Windows remove viruses? | 2,826 | 3 | 9.45 | Refresh completed; measure CTR |
| Windows 11 volume control not working | 1,246 | 6 | 8.14 | Refresh completed; measure CTR |
| `nvlddmkm.sys` Event ID 13 | 629 | 2 | 11.76 | Refresh completed; measure CTR |
| Clock Watchdog Timeout 0x101 | 371 | 7 | 15.29 | Next refresh candidate |
| KMODE 0x1E | 340 | 2 | 9.42 | Next refresh candidate |
| KB5121003 / `inpoutx64.sys` | 1,720 | 38 | 8.23 | Protect; improve only with evidence |
| Add a website to Google Search | 3,844 | 0 | 59.36 | Consolidate and retitle; do not create duplicates |
| Sitemap errors in Search Console | 302 | 1 | 16.56 | Consolidate overlapping sitemap pages |

## Search-language findings

Community wording supports the existing page-one refreshes:

- Windows volume problems are commonly described as the slider moving while audio stays at 0%, 100%, or a fixed level; app-level volume may still work.
- Malware questions often ask whether a factory reset is enough, whether `Keep my files` is safe, and whether a USB clean install is safer.
- NVIDIA reports use `nvlddmkm.sys`, Event ID 13/14/153, black screen, `VIDEO_TDR_FAILURE`, and driver-versus-hardware uncertainty together.

Reddit is being used for wording and failure patterns only. It is not being treated as proof that a particular fix works.

## New-topic queue

### Candidate: Microsoft Basic Display Adapter after a missing NVIDIA GPU

Working title: **NVIDIA GPU Missing in Windows 11? Fix Microsoft Basic Display Adapter**

Why it is worth researching: a fresh August 2026 report described Windows 11 removing a discrete GPU driver after a laptop remained in Eco mode, leaving Microsoft Basic Display Adapter behind. The official Microsoft page confirms what that generic driver means and how to return to the manufacturer's driver. The topic should not be published until the Eco-mode mechanism is confirmed by a primary source or clearly labelled as a reported scenario.

Sources to validate before drafting:

- [Microsoft Basic Display Adapter in Windows](https://support.microsoft.com/en-US/Windows/Hardware/Display-Graphics/microsoft-basic-display-adapter-in-windows)
- [Microsoft display-driver troubleshooting](https://support.microsoft.com/en-US/Windows/Hardware/Display-Graphics/troubleshoot-external-monitor-connections-in-windows)
- [Current report describing the Eco-mode scenario](https://www.techradar.com/computing/windows/took-me-months-to-work-this-out-redditor-explains-how-windows-11-can-end-up-stripping-out-the-gpu-driver-from-your-gaming-laptop)

### Do not create yet

- A separate article for Windows volume slider versus Bluetooth volume. The current volume article can cover both branches.
- Another generic WSL2 networking page. The new WSL2 article should earn data first.
- Another `nvlddmkm` page for Event ID 153. Link the existing Event ID 153 page to the Event ID 13 page and differentiate the diagnosis.
- More sitemap pages. Consolidate the existing Search Console sitemap cluster first.

## Measurement rule

Measure the five refreshed pages at 7, 14, and 28 days after publication. The first test is title/opening CTR, not article length. New pages should be measured separately and protected from early rewrites. A page earns expansion only when it shows demand, a distinct intent, or a reusable diagnostic asset.
