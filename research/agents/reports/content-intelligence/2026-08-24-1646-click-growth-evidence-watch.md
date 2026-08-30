# Click-growth evidence watch — 2026-08-24 16:46 GST

## Evidence checked

- Live Google Search Console pull completed on **August 24, 2026** via [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/seo-agent/gsc-client.mjs`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/seo-agent/gsc-client.mjs)
  - Fresh page snapshot reviewed for the last 7 and 28 days
- Latest available Bing evidence checked on **August 24, 2026**
  - Live Bing API pull failed with `InvalidApiKey`
  - Last usable local Bing export remains [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/analytics-data.json`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/analytics-data.json), fetched **July 21, 2026**
- Local content inventory reviewed:
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/does-resetting-windows-remove-viruses-completely.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/does-resetting-windows-remove-viruses-completely.mdx)
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11.mdx)
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/windows-11-volume-control-not-working-8-proven-fixes-for-2026.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/windows-11-volume-control-not-working-8-proven-fixes-for-2026.mdx)
- Recent public discussion checked on **August 24, 2026**
  - Microsoft Q&A malware/reset thread published **August 6, 2026**
  - Microsoft Q&A KMODE thread published **June 7, 2026**
  - Microsoft Q&A Windows update with sound issues thread published **August 6, 2026**
  - Tom’s Hardware `nvlddmkm` crash thread published **July 16, 2026**

## Trend

Live GSC still points to the same near-page-one CTR cluster as the strongest click-growth path, and it still favors updating existing Windows troubleshooting pages over proposing a new topic.

- `/blog/does-resetting-windows-remove-viruses-completely`
  - **3,731 impressions, 7 clicks, 0.19% CTR, position 9.8** over the last 28 days
  - **724 impressions, 1 click, 0.14% CTR, position 10.6** over the last 7 days
- `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11`
  - **563 impressions, 1 click, 0.18% CTR, position 11.8** over the last 28 days
  - **548 impressions, 1 click, 0.18% CTR, position 11.8** over the last 7 days
- `/blog/windows-11-volume-control-not-working-8-proven-fixes-for-2026`
  - **1,286 impressions, 6 clicks, 0.47% CTR, position 8.2** over the last 28 days
  - **308 impressions, 1 click, 0.32% CTR, position 7.1** over the last 7 days

Bing does not change priority in this run because the current API credential is invalid and the local export is more than a month old.

## Affected URLs and recommended changes

### 1. `/blog/does-resetting-windows-remove-viruses-completely`

- Title test:
  - `Does Resetting Windows Remove Viruses? What Keep My Files, Remove Everything, and Clean Install Actually Remove`
- Description test:
  - `Learn what Reset this PC can remove, when Keep my files is risky, when Defender Offline helps, and when Microsoft recommends reinstalling Windows.`
- Content change:
  - Keep the existing Microsoft-first structure, but tighten the first two paragraphs into a shorter snippet block that names **Keep my files**, **Remove everything**, and **installation media** immediately.
  - Add one short early sentence clarifying that a reset does not validate secondary drives, restored backups, or firmware.
- Internal-link change:
  - Move the existing reinstall/BSOD links higher so one appears before the midpoint of the article.
- Primary sources:
  - [Microsoft Support: Reset your PC](https://support.microsoft.com/en-us/windows/reset-your-pc-0ef73740-b927-549b-b7c9-e6f2b48d275e)
  - [Microsoft Learn: Microsoft Defender Offline](https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-offline)
  - [Microsoft Support: Reinstall Windows with installation media](https://support.microsoft.com/en-us/windows/reinstall-windows-with-the-installation-media-d8369486-3e33-7d9c-dccc-859e2b022fc7)
  - [Microsoft Q&A: i have a virus in my computer can you help me](https://learn.microsoft.com/en-us/answers/questions/5968721/i-have-a-virus-in-my-computer-can-you-help-me)
- Confidence: `high`

### 2. `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11`

- Title test:
  - `nvlddmkm.sys Event ID 13 on Windows 11: Driver, Power, Heat, or GPU Fault?`
- Description test:
  - `Troubleshoot nvlddmkm.sys Event ID 13 with a safe checklist for official NVIDIA drivers, DDU cleanup, stock clocks, thermals, power checks, and hardware evidence.`
- Content change:
  - Add the exact Event Viewer phrasing closer to the top so the page matches the query language users copy into search.
  - Add a short line that OEM laptop graphics packages can be safer than generic NVIDIA packages on mux/hybrid systems.
- Internal-link change:
  - Surface the Event ID 153 page earlier in the body, not only near the end, because it is already a stronger adjacent GPU diagnostic page.
- Primary sources:
  - [Microsoft Learn: Timeout Detection and Recovery](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/timeout-detection-and-recovery)
  - [Microsoft Learn: TDR registry keys](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/tdr-registry-keys)
  - [NVIDIA Driver Downloads](https://www.nvidia.com/en-us/drivers/)
  - [Wagnardsoft: Display Driver Uninstaller](https://www.wagnardsoft.com/)
  - [Tom’s Hardware: nvlddmkm crash saga](https://forums.tomshardware.com/threads/nvlddmkm-14-153-crash-saga-leading-to-pc-not-turning-on-at-all.3898088/)
- Confidence: `medium-high`

### 3. `/blog/windows-11-volume-control-not-working-8-proven-fixes-for-2026`

- Title test:
  - `Windows 11 Volume Control Not Working? 8 Fixes in the Right Order`
- Description test:
  - `Fix a broken Windows 11 volume slider with the fastest checks first: output device, audio service restart, Explorer restart, driver rollback, and update-related fixes.`
- Content change:
  - Replace unsupported lab-style claims such as “8 out of 10 test machines” and “90% of the time” with source-safe wording grounded in Microsoft troubleshooting steps.
  - Move the default output device check and service restart into the first-screen answer block so the snippet promises an ordered fix path, not just a command.
  - Add one short note that recent optional preview or driver changes can be involved, without asserting a specific bug rate.
- Internal-link change:
  - Add an earlier link to the update-troubleshooting page so users who connect the issue to a recent update have a direct branch.
- Primary sources:
  - [Microsoft Support: Fix sound or audio problems in Windows](https://support.microsoft.com/en-us/windows/fix-sound-or-audio-problems-in-windows-10-047798e8-3bdf-7b58-8c6b-e95bd6c76d2d)
  - [Microsoft Learn: Understanding Windows Update rules for driver distribution](https://learn.microsoft.com/en-us/windows-hardware/drivers/dashboard/understanding-windows-update-automatic-and-optional-rules-for-driver-distribution)
  - [Microsoft Q&A: volume slider not working on Windows 11](https://learn.microsoft.com/en-us/answers/questions/4299814/volume-slider-not-working-on-windows-11)
  - [Microsoft Q&A: sound issues after Windows 11 update](https://learn.microsoft.com/en-gb/answers/questions/5967856/subject-urgent-high-fan-noise-hanging-sound-issues)
- Confidence: `medium-high`

## New-topic decision

No new topic is recommended in this run.

- Live GSC still shows clearer upside in three existing URLs already ranking between roughly positions **8 and 12**.
- The recent public discussions map back onto current Windows troubleshooting coverage rather than exposing an uncovered query cluster.
- The highest-impression non-priority page in live GSC for this run is not in the target ranking band, so it does not beat the CTR fixes above.

## Next measurement window

- Primary recheck: **Monday, August 31, 2026**
- Secondary recheck: **Monday, September 7, 2026**
- Bing note:
  - Refresh Bing evidence only after the API key is repaired or a newer export than **July 21, 2026** is generated.
