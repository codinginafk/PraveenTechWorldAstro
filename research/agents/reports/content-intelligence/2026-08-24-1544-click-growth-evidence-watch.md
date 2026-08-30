# Click-growth evidence watch — 2026-08-24 15:44 GST

## Evidence checked

- Latest available Google Search Console evidence in repo:
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/reports/content-intelligence/2026-08-24-targeted-click-sprint.md`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/reports/content-intelligence/2026-08-24-targeted-click-sprint.md)
  - Comparison window there: **2026-08-08 to 2026-08-14** vs **2026-08-15 to 2026-08-21** with a 3-day lag.
- Latest available Bing Webmaster evidence in repo:
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/analytics-data.json`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/analytics-data.json)
  - File `lastRun`: **2026-07-21T09:42:14.689Z**
  - File `fetchedAt`: **2026-07-21T09:42:39.659Z**
  - Bing crawl stats in that snapshot rise to **69 indexed URLs** by **2026-07-20**, but query traffic remains sparse.
- Local inventory checked:
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/does-resetting-windows-remove-viruses-completely.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/does-resetting-windows-remove-viruses-completely.mdx)
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11.mdx)
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen.mdx)
  - Supporting pages:
    - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/hubs/windows-troubleshooting.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/hubs/windows-troubleshooting.mdx)
    - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/will-reinstalling-windows-fix-blue-screen-errors.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/will-reinstalling-windows-fix-blue-screen-errors.mdx)
    - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/pc-keeps-crashing-how-to-tell-if-it-s-a-ram-issue-or-a-bad-driver.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/pc-keeps-crashing-how-to-tell-if-it-s-a-ram-issue-or-a-bad-driver.mdx)
    - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/pc-crashes-only-under-load-gpu-vs-psu-thermal-guide.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/pc-crashes-only-under-load-gpu-vs-psu-thermal-guide.mdx)
- Public discussion checked on **2026-08-24**:
  - Microsoft Q&A malware/reset thread published **2026-08-06**
  - Microsoft Q&A KMODE thread published **2026-06-07**
  - Tom's Hardware `nvlddmkm` Event ID 13 thread crawled **last week** and described as posted **yesterday**

## Trend

The click-growth priority is still the existing **Windows recovery / GPU crash / BSOD** cluster. No fresher local evidence supports a new topic.

- GSC striking-distance pages remain:
  - `/blog/does-resetting-windows-remove-viruses-completely` — **932 impressions, 0 clicks, 0.00% CTR, position 9.90**
  - `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11` — **476 impressions, 1 click, 0.21% CTR, position 11.79**
  - `/blog/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen` — **249 impressions, 2 clicks, 0.80% CTR, position 9.10**
- Bing remains useful only as directional confirmation. The **2026-07-21** export is too stale and too thin to change editorial priorities.
- Public discussions still mirror the same three intents:
  - reset vs clean reinstall after malware
  - exact `nvlddmkm` Event ID 13 wording and whether it is driver, power, or GPU
  - 0x1E BSODs that survive generic repair steps and require dump-first diagnosis

## Affected URLs and recommended changes

### 1. `/blog/does-resetting-windows-remove-viruses-completely`

- Recommended title test:
  - `Does Resetting Windows Remove Viruses? When Reset Is Enough and When to Reinstall`
- Recommended description test:
  - `Learn what Keep my files, Remove everything, Defender Offline, and a clean reinstall can and cannot remove after a Windows malware infection.`
- Recommended content change:
  - Add a short above-the-fold callout for when Microsoft recommends installation media rather than another reset attempt.
  - Add one sentence clarifying that reset failure loops are a separate recovery problem, not evidence the malware is gone.
- Recommended internal links:
  - Link earlier to the reinstall decision page and BitLocker recovery loop page.
  - Add a reciprocal contextual link from the reinstall/BSOD page back to this reset page.
- Primary sources:
  - [Reset your PC](https://support.microsoft.com/en-us/windows/reset-your-pc-0ef73740-b927-549b-b7c9-e6f2b48d275e)
  - [Recovery options in Windows](https://support.microsoft.com/en-us/windows/experience/backup-recovery/recovery-options-in-windows)
  - [Microsoft Defender Offline scan in Windows](https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-offline)
  - [Reinstall Windows with the installation media](https://support.microsoft.com/en-us/Windows/Deployment/Install-Upgrade/reinstall-windows-with-the-installation-media)
- Forum evidence:
  - [Microsoft Q&A: i have a virus in my computer can you help me](https://learn.microsoft.com/en-us/answers/questions/5968721/i-have-a-virus-in-my-computer-can-you-help-me)
- Confidence: `high`

### 2. `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11`

- Recommended title test:
  - `nvlddmkm Event ID 13 on Windows 11: Driver, Power, or GPU Fault?`
- Recommended description test:
  - `Fix nvlddmkm Event ID 13 on Windows 11 with a safe checklist for driver rollback, DDU cleanup, stock clocks, thermals, power, and hardware checks.`
- Recommended content change:
  - Add the exact Event Viewer wording high in the article because the forum thread still uses that exact string.
  - Add a short laptop-specific note to prefer OEM graphics packages when vendor tuning conflicts with generic NVIDIA packages.
- Recommended internal links:
  - Link earlier to the Event ID 153 page and the GPU-vs-PSU guide.
  - Add one contextual link from the RAM-vs-driver page back to this Event ID 13 article.
- Primary sources:
  - [WDDM support for Timeout Detection and Recovery](https://learn.microsoft.com/en-us/Windows-hardware/drivers/display/timeout-detection-and-recovery)
  - [Testing and debugging TDR during driver development](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/tdr-registry-keys)
  - [NVIDIA driver downloads](https://www.nvidia.com/en-us/drivers/)
  - [Display Driver Uninstaller](https://www.wagnardsoft.com/)
- Forum evidence:
  - [Tom's Hardware: Weird Freeze during gaming that happens one time and then goes away after restart? event log shows nvlddmkm id 13](https://forums.tomshardware.com/threads/weird-freeze-during-gaming-that-happens-one-time-and-then-goes-way-after-restart-event-log-shows-nvlddmkm-id-13.3899319/)
- Confidence: `medium-high`

### 3. `/blog/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen`

- Recommended title test:
  - `KMODE_EXCEPTION_NOT_HANDLED (0x1E) on Windows 11: Driver, RAM, or Power-State Fix`
- Recommended description test:
  - `Fix KMODE_EXCEPTION_NOT_HANDLED (0x1E) with Microsoft-based dump analysis, driver rollback, stock RAM testing, sleep-state checks, and system-file repair.`
- Recommended content change:
  - Add one short branch for crashes during idle, sleep, or resume.
  - Add one sentence near the WinDbg section clarifying that changing module names across dumps can indicate memory instability.
- Recommended internal links:
  - Link earlier to the RAM-vs-driver page and the reinstall decision page.
  - Add one contextual link from the clock-watchdog article back to this page around dump-first debugging.
- Primary sources:
  - [Bug check 0x1E: KMODE_EXCEPTION_NOT_HANDLED](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x1e--kmode-exception-not-handled)
  - [Windows Debugger documentation](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/)
  - [Use the System File Checker tool to repair missing or corrupted system files](https://support.microsoft.com/en-us/windows/experience/backup-recovery/use-the-system-file-checker-tool-to-repair-missing-or-corrupted-system-files)
- Forum evidence:
  - [Microsoft Q&A: KMODE_EXCEPTION_NOT_HANDLED (1e) BSOD persisting Despite Troubleshoots](https://learn.microsoft.com/en-us/answers/questions/5913593/kmode-exception-not-handled-1e-bsod-persisting-des)
  - [Microsoft Q&A: How to fix BSOD. STOP CODE: KMODE_EXCEPTION_NOT_HANDLED (0x1E)](https://learn.microsoft.com/en-us/answers/questions/5817856/how-to-fix-bsod-stop-code-kmode-exception-not-hand)
- Confidence: `medium-high`

## New-topic decision

No new topic is recommended in this run.

- The latest available GSC evidence still offers three existing URLs already in positions **9 to 12** with weak CTR.
- The public-discussion evidence maps directly onto those existing pages.
- The local inventory already covers adjacent intents well enough that a new article would dilute effort.

## Next measurement window

- First check: **Monday, August 31, 2026**
  - Compare against the **2026-08-15 to 2026-08-21** GSC baseline once a newer complete week is available.
- Second check: **Monday, September 7, 2026**
  - If positions hold in the **5 to 12** band but CTR stays weak, test only title and meta description packaging next.
- Bing:
  - Do not make a Bing-led editorial decision until a newer Bing export than **2026-07-21** exists locally.
