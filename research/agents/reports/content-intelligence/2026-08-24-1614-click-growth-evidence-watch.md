# Click-growth evidence watch — 2026-08-24 16:14 GST

## Evidence checked

- Latest in-repo Google Search Console summary:
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/reports/content-intelligence/2026-08-24-full-gsc-opportunity-analysis.md`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/reports/content-intelligence/2026-08-24-full-gsc-opportunity-analysis.md)
  - Complete-week comparison there: **August 9–15, 2026** vs **August 16–22, 2026**
- Latest in-repo Bing Webmaster export:
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/analytics-data.json`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/analytics-data.json)
  - `lastRun`: **2026-07-21T09:42:14.689Z**
  - `fetchedAt`: **2026-07-21T09:42:39.659Z**
- Current local content inventory reviewed:
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/does-resetting-windows-remove-viruses-completely.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/does-resetting-windows-remove-viruses-completely.mdx)
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11.mdx)
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen.mdx)
- Current public discussion checked on **August 24, 2026**:
  - Microsoft Q&A malware/reset thread published **August 6, 2026**
  - Microsoft Q&A KMODE thread published **June 7, 2026**
  - Microsoft Q&A second KMODE thread published **March 11, 2026**
  - Tom’s Hardware `nvlddmkm` Event ID 13 thread published **August 19, 2026**

## Trend

Search visibility is growing, and the best near-term click opportunity is still to improve existing Windows troubleshooting pages already close to page one.

- Site-level GSC momentum improved from **23 clicks / 4,658 impressions** on **August 9–15, 2026** to **101 clicks / 9,119 impressions** on **August 16–22, 2026**.
- The highest-impression weak-CTR pages in the current local GSC summary remain existing pages, not uncovered topic gaps:
  - `/blog/does-resetting-windows-remove-viruses-completely` — **4,722 impressions, 9 clicks, 0.2% CTR, position 10.6**
  - `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11` — **563 impressions, position 11.8, 0.2% CTR**
  - `/blog/windows-11-volume-control-not-working-8-proven-fixes-for-2026` — **1,402 impressions, 6 clicks, 0.4% CTR, position 8.5**
- The current watcher scope is capped at three articles. Two of the three strongest candidates are already in the prior Windows crash cluster, and the volume-control page now edges out the KMODE page on impression scale.
- Bing remains only directional confirmation. The export is more than a month older than the current GSC evidence and is too stale for a Bing-led editorial choice.

## Affected URLs and recommended changes

### 1. `/blog/does-resetting-windows-remove-viruses-completely`

- Why it stays priority:
  - Highest current page-one-ish impression pool in the local GSC summary.
  - The article already covers the core Microsoft recovery options, so the lift is packaging and first-screen clarity rather than a rewrite.
- Recommended title test:
  - `Does Resetting Windows Remove Viruses? What Keep My Files, Remove Everything, and Reinstall Actually Remove`
- Recommended description test:
  - `Learn what Reset this PC can remove, when Keep my files is risky, when Defender Offline helps, and when Microsoft recommends reinstalling Windows.`
- Recommended content change:
  - Tighten the opening paragraph into a direct snippet answer that explicitly contrasts **Keep my files**, **Remove everything**, and **installation media** in one compact block.
  - Add a short callout near the top that a successful reset does not prove secondary drives, restored backups, or firmware are clean.
- Recommended internal-link change:
  - Keep the existing links to the BSOD and BitLocker recovery pages, but add an earlier contextual link to the reinstall decision article in the first half of the page.
- Primary sources:
  - [Microsoft Support: Reset your PC](https://support.microsoft.com/en-us/windows/reset-your-pc-0ef73740-b927-549b-b7c9-e6f2b48d275e)
  - [Microsoft Learn: Microsoft Defender Offline](https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-offline)
  - [Microsoft Support: Reinstall Windows with installation media](https://support.microsoft.com/en-us/windows/reinstall-windows-with-the-installation-media-d8369486-3e33-7d9c-dccc-859e2b022fc7)
  - [Microsoft Q&A: i have a virus in my computer can you help me](https://learn.microsoft.com/en-us/answers/questions/5968721/i-have-a-virus-in-my-computer-can-you-help-me)
- Confidence: `high`

### 2. `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11`

- Why it stays priority:
  - Still sits in the **11.8** position band with very weak CTR.
  - Fresh forum evidence still uses the exact `nvlddmkm` / `Event ID 13` wording, which supports an exact-intent snippet test rather than a topic expansion.
- Recommended title test:
  - `nvlddmkm.sys Event ID 13 on Windows 11: Driver, Power, Heat, or GPU Fault?`
- Recommended description test:
  - `Troubleshoot nvlddmkm.sys Event ID 13 with a safe checklist for official drivers, DDU cleanup, stock clocks, thermals, power cables, and hardware checks.`
- Recommended content change:
  - Add the exact Event Viewer wording near the top so the snippet matches the language users paste into forums.
  - Add a short OEM-laptop note that vendor graphics packages may be safer than generic NVIDIA packages when mux, hybrid graphics, or OEM tuning is involved.
- Recommended internal-link change:
  - Keep the existing Event ID 153 cross-link and add one earlier in the article body, not just at the end, because the Event ID 153 page is already a better-performing adjacent GPU diagnostic.
- Primary sources:
  - [Microsoft Learn: WDDM support for timeout detection and recovery](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/timeout-detection-and-recovery)
  - [Microsoft Learn: TDR registry keys](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/tdr-registry-keys)
  - [NVIDIA: Driver Downloads](https://www.nvidia.com/en-us/drivers/)
  - [Wagnardsoft: Display Driver Uninstaller](https://www.wagnardsoft.com/)
  - [Tom’s Hardware: Weird Freeze during gaming that happens one time and then goes away after restart? event log shows nvlddmkm id 13](https://forums.tomshardware.com/threads/weird-freeze-during-gaming-that-happens-one-time-and-then-goes-way-after-restart-event-log-shows-nvlddmkm-id-13.3899319/)
- Confidence: `medium-high`

### 3. `/blog/windows-11-volume-control-not-working-8-proven-fixes-for-2026`

- Why it replaces KMODE in this run:
  - The latest complete local GSC summary shows materially more impression scale than the KMODE page while remaining in a snippet-testable ranking band.
  - This is a CTR packaging opportunity on an existing page already in the top 10, which fits the “update at most three existing articles” constraint better than opening a new cluster.
- Recommended title test:
  - `Windows 11 Volume Control Not Working? 8 Fixes in the Right Order`
- Recommended description test:
  - `Fix a broken Windows 11 volume slider with the fastest checks first: audio service restart, output device checks, driver rollback, app mixer reset, and update-related fixes.`
- Recommended content change:
  - Move the fastest two diagnostic steps into a tighter first-screen answer block so the SERP snippet promises ordered troubleshooting, not a generic list.
  - Add one short sentence clarifying when to suspect a recent update or driver conflict versus a single-app mixer problem.
- Recommended internal-link change:
  - Keep the existing GPU-crash and reset-page links, but add one earlier link to the KB5121003 / `inpoutx64` article when audio issues follow a recent update.
- Primary sources:
  - [Microsoft Support: Fix sound or audio problems in Windows](https://support.microsoft.com/en-us/windows/fix-sound-or-audio-problems-in-windows-73025246-b61c-40fb-671a-2535c7cd56c8)
  - [Microsoft Support: Update drivers manually in Windows](https://support.microsoft.com/en-us/windows/update-drivers-manually-in-windows-ec62f46c-ff14-c91d-eead-d7126dc1f7b6)
- Confidence: `medium`

## New-topic decision

No new topic is recommended in this run.

- The latest local GSC evidence still shows multiple existing URLs between roughly positions **8 and 12** with weak CTR and clearer upside than a net-new post.
- The fresh public discussions map back onto current Windows troubleshooting pages already in the inventory.
- The local content set already covers the adjacent malware reset, GPU crash, BSOD, and update-troubleshooting intents well enough that a new article would likely split authority.

## Next measurement window

- Primary check: **Monday, August 31, 2026**
  - Recompare against the **August 16–22, 2026** baseline once the next full week is complete.
- Secondary check: **Monday, September 7, 2026**
  - If positions remain in the **5–12** range but CTR stays weak, keep testing only title, description, and first-screen answer packaging before broader body changes.
- Bing rule:
  - Do not make a Bing-led editorial decision until a local Bing export newer than **July 21, 2026** exists.
