# Click-growth evidence watch — 2026-08-24 20:14 GST

## Evidence checked

- Latest complete-window Google Search Console evidence in repo:
  - [`research/agents/reports/content-intelligence/2026-08-24-targeted-click-sprint.md`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/reports/content-intelligence/2026-08-24-targeted-click-sprint.md)
  - [`research/agents/reports/content-intelligence/2026-08-24-full-gsc-opportunity-analysis.md`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/reports/content-intelligence/2026-08-24-full-gsc-opportunity-analysis.md)
  - Comparison window there remains **2026-08-08 to 2026-08-14** vs **2026-08-15 to 2026-08-21**, using a 3-day lag.
- Additional local GSC scratch export checked:
  - [`research/agents/temp-gsc-report.json`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/temp-gsc-report.json)
  - This file is not a safe replacement for the complete-window analysis in this run. It is dominated by the password-manager and Google-site-registration query clusters, includes mixed `h24`/`h48`/`d7`/`d28` slices, and does not map the leading queries back to page-level windows cleanly enough for a controlled refresh decision.
- Latest Bing evidence in repo:
  - [`research/agents/analytics-data.json`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/analytics-data.json)
  - `lastRun` is **2026-07-21T09:42:14.689Z** and `fetchedAt` is **2026-07-21T09:42:39.659Z**.
  - Bing crawl/index data still shows discovery improving into July, with `InIndex` reaching **69**, but query/rank traffic remains too thin and too stale to outrank the August GSC signals.
- Local content inventory checked:
  - [`src/content/articles/does-resetting-windows-remove-viruses-completely.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/does-resetting-windows-remove-viruses-completely.mdx)
  - [`src/content/articles/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11.mdx)
  - [`src/content/articles/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen.mdx)
- Recent public discussion checked with browsing:
  - Microsoft Q&A malware/reset thread from **August 6, 2026**:
    - [i have a virus in my computer can you help me](https://learn.microsoft.com/en-us/answers/questions/5968721/i-have-a-virus-in-my-computer-can-you-help-me)
  - Microsoft Q&A KMODE thread from **March 11, 2026**:
    - [How to fix BSOD. STOP CODE: KMODE_EXCEPTION_NOT_HANDLED (0x1E)](https://learn.microsoft.com/en-us/answers/questions/5817856/how-to-fix-bsod-stop-code-kmode-exception-not-hand)
  - Microsoft Q&A nvlddmkm discussion showing the exact Event ID 13 wording:
    - [nvlddmkm event id 153, 13 and a warning](https://learn.microsoft.com/en-us/answers/questions/3964923/nvlddmkm-event-id-153-13-and-a-warning)

## Trend

The recommendation set is unchanged from the stronger August 24 complete-window GSC analysis: the highest-confidence click-growth lane is still **SERP packaging plus internal-link tightening on three existing Windows troubleshooting pages**.

- The best complete-window opportunities in the latest trusted GSC report remain:
  - `/blog/does-resetting-windows-remove-viruses-completely` — **932 impressions, 0 clicks, 0.00% CTR, position 9.90**
  - `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11` — **476 impressions, 1 click, 0.21% CTR, position 11.79**
  - `/blog/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen` — **249 impressions, 2 clicks, 0.80% CTR, position 9.10**
- Those three articles already show `updatedDate: 2026-08-24`, so a second body rewrite in the same measurement window would violate the guardrail against multiple uncontrolled changes.
- The scratch GSC export does surface a separate password-manager pricing cluster, but that local file is not enough to displace the Windows lane because:
  - the repository already notes query/page mismatch in the full-opportunity analysis;
  - the password-manager page would require fresh vendor-price verification before any edit;
  - the current run is capped to existing evidence-backed recommendations, not speculative reshuffling.
- Bing still supports the same conclusion directionally: discovery is better than it was in early July, but the Bing query sample is too sparse to justify a Bing-led topic or to overrule the stronger Google window.

## Affected URLs and recommended changes

### 1. `/blog/does-resetting-windows-remove-viruses-completely`

- Recommended title test:
  - `Does Resetting Windows Remove Viruses? When Reset Is Enough and When to Reinstall`
- Recommended description test:
  - `Learn what Keep my files, Remove everything, Defender Offline, and a clean reinstall can and cannot remove after a Windows malware infection.`
- Recommended content adjustment:
  - Add a short top-of-article callout that explicitly separates **Reset this PC** from **installation-media reinstall** when malware or recovery corruption persists.
- Recommended internal-link adjustment:
  - Strengthen links to the blue-screen reinstall guide and the BitLocker recovery loop guide.
- Primary sources:
  - [Reset your PC](https://support.microsoft.com/en-us/windows/reset-your-pc-0ef73740-b927-549b-b7c9-e6f2b48d275e)
  - [Reinstall Windows with installation media](https://support.microsoft.com/en-us/windows/reinstall-windows-with-the-installation-media-d8369486-3e33-7d9c-dccc-859e2b022fc7)
  - [Microsoft Defender Offline](https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-offline)
  - [Troubleshoot problems with detecting and removing malware](https://support.microsoft.com/en-us/defender/troubleshoot-problems-with-detecting-and-removing-malware)
- Confidence: `high`

### 2. `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11`

- Recommended title test:
  - `nvlddmkm Event ID 13 on Windows 11: Driver, Power, or GPU Fault?`
- Recommended description test:
  - `Fix nvlddmkm Event ID 13 on Windows 11 with a safe checklist for driver rollback, DDU cleanup, stock clocks, thermals, power, and hardware checks.`
- Recommended content adjustment:
  - Add a short subsection that mirrors the exact Event Viewer wording users paste into support threads: `The description for Event ID 13 from source nvlddmkm cannot be found`.
- Recommended internal-link adjustment:
  - Link earlier to the Event ID 153 article and the GPU-vs-PSU thermal guide.
- Primary sources:
  - [Timeout Detection and Recovery](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/timeout-detection-and-recovery)
  - [TDR registry keys](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/tdr-registry-keys)
  - [NVIDIA driver downloads](https://www.nvidia.com/en-us/drivers/)
  - [Display Driver Uninstaller](https://www.wagnardsoft.com/)
- Confidence: `medium-high`

### 3. `/blog/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen`

- Recommended title test:
  - `KMODE_EXCEPTION_NOT_HANDLED (0x1E) on Windows 11: Driver, RAM, or Power-State Fix`
- Recommended description test:
  - `Fix KMODE_EXCEPTION_NOT_HANDLED (0x1E) with Microsoft-based dump analysis, driver rollback, stock RAM testing, sleep-state checks, and system-file repair.`
- Recommended content adjustment:
  - Add a short branch for crashes tied to idle, sleep, or resume, since recent support threads still blur that path together with generic driver failure.
- Recommended internal-link adjustment:
  - Link earlier to the RAM-vs-driver diagnosis guide and the Windows reinstall decision guide.
- Primary sources:
  - [Bug Check 0x1E (KMODE_EXCEPTION_NOT_HANDLED)](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x1e--kmode-exception-not-handled)
  - [Windows Debugger documentation](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/)
  - [System File Checker](https://support.microsoft.com/en-us/windows/system-file-checker-9c1f1c3f-8f0f-4dbf-9a9a-6c7f2d5b8f4a)
- Confidence: `medium-high`

## New-topic decision

No new topic is recommended in this run.

- The strongest trusted search evidence still sits on three existing URLs already ranking between positions 9 and 12.
- The recent public support discussions map directly to those existing intents.
- The only visible alternate cluster in fresher scratch data is password-manager pricing, but no existing complete-window page mapping plus no fresh vendor-price verification means it should stay out of this run’s recommendation set.

## Next measurement window

- First measurement window: **Monday, August 31, 2026**
  - Compare these three URLs against the **2026-08-15 to 2026-08-21** baseline after a new complete week is available.
- Second measurement window: **Monday, September 7, 2026**
  - If positions stay in the 5 to 12 band and CTR remains weak, test only title/description changes next.
- Bing follow-up:
  - Wait for a Bing export newer than **July 21, 2026** before making any Bing-led editorial recommendation.

## Status

`REPORT_ONLY`
