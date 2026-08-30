# Click-growth evidence watch — 2026-08-24 00:44 GST

## Evidence checked

- Latest complete-window Google Search Console evidence already stored in repo:
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/reports/content-intelligence/2026-08-24-targeted-click-sprint.md`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/reports/content-intelligence/2026-08-24-targeted-click-sprint.md)
  - Baseline window: **2026-08-08 to 2026-08-14**
  - Comparison window: **2026-08-15 to 2026-08-21**
- Latest scratch GSC query export in repo:
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/temp-gsc-report.json`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/temp-gsc-report.json)
  - This remains a partial query-only dump and still cannot be safely mapped back to the stronger complete-window page analysis.
- Latest Bing Webmaster evidence in repo:
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/analytics-data.json`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/analytics-data.json)
  - Freshest local Bing fetch still appears to be **2026-07-21T09:42:39.659Z**
- Local inventory checked:
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/does-resetting-windows-remove-viruses-completely.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/does-resetting-windows-remove-viruses-completely.mdx)
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11.mdx)
  - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen.mdx)
  - Supporting cluster pages in the same diagnostic path:
    - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/hubs/windows-troubleshooting.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/hubs/windows-troubleshooting.mdx)
    - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/will-reinstalling-windows-fix-blue-screen-errors.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/will-reinstalling-windows-fix-blue-screen-errors.mdx)
    - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/pc-keeps-crashing-how-to-tell-if-it-s-a-ram-issue-or-a-bad-driver.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/pc-keeps-crashing-how-to-tell-if-it-s-a-ram-issue-or-a-bad-driver.mdx)
    - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/pc-crashes-only-under-load-gpu-vs-psu-thermal-guide.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/pc-crashes-only-under-load-gpu-vs-psu-thermal-guide.mdx)
    - [`/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-nvlddmkm-event-id-153-gpu-crashes.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-nvlddmkm-event-id-153-gpu-crashes.mdx)
- Recent public discussions checked:
  - Microsoft Q&A thread on reinstall/reset expectations and malware cleanup behavior
  - Microsoft Q&A thread on `nvlddmkm` Event ID 13 / 153 symptoms
  - Microsoft Q&A threads on `KMODE_EXCEPTION_NOT_HANDLED (0x1E)` recurrence after reinstall or update

## Trend

No materially newer search evidence appeared after the August 24, 2026 evening watcher runs, so the priority stack is unchanged.

- The complete-window GSC comparison still supports three existing Windows troubleshooting URLs as the best click-growth targets.
- Bing remains too stale to change prioritization.
- The scratch GSC query export shows two live pockets:
  - password-manager pricing queries ranking around positions **7.8 to 10.5** with zero visible clicks
  - “add site to Google” queries mostly outside page one, with only a small handful in positions **14 to 20**
- Because that scratch export is not reconciled to the complete page table, it is not strong enough to displace the existing three-page Windows CTR queue.

## Affected URLs

1. `/blog/does-resetting-windows-remove-viruses-completely`
   - Latest complete-window evidence still shows the largest near-page-one CTR gap in the current queue.
2. `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11`
   - Still sits in the page-two-to-page-one transition band where better snippet wording and cluster routing can matter.
3. `/blog/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen`
   - Still has enough impressions and rank proximity to justify packaging improvements before another body rewrite.

## Recommended changes

### 1. `/blog/does-resetting-windows-remove-viruses-completely`

- Title:
  - Change from `Does Reinstalling Windows Remove Viruses?` to `Does Resetting or Reinstalling Windows Remove Viruses? When Reset Is Enough`
- Description:
  - Tighten to `Compare Keep my files, Remove everything, Defender Offline, and clean reinstall paths after a Windows malware infection.`
- Content:
  - Add a short top-of-article decision box distinguishing `Reset this PC`, `Defender Offline`, and installation-media reinstall.
  - Add one short note that a successful reset does not validate external drives, firmware, or restored backups.
- Internal links:
  - Link earlier to the reinstall/BSOD article and to the BitLocker recovery loop article if recovery blockers are mentioned.
- Primary-source links:
  - [Microsoft Support: Reset your PC](https://support.microsoft.com/en-us/windows/reset-your-pc-0ef73740-b927-549b-b7c9-e6f2b48d275e)
  - [Microsoft Support: Reinstall Windows with installation media](https://support.microsoft.com/en-us/windows/reinstall-windows-with-the-installation-media-d8369486-3e33-7d9c-dccc-859e2b022fc7)
  - [Microsoft Learn: Microsoft Defender Offline](https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-offline)
  - [Microsoft Support: Troubleshoot problems with detecting and removing malware](https://support.microsoft.com/en-us/defender/troubleshoot-problems-with-detecting-and-removing-malware)
- Discussion links:
  - [Microsoft Q&A: How to Reset Windows 11 - ARTICLE](https://learn.microsoft.com/en-us/answers/questions/2337356/how-to-reset-windows-11-article)
  - [Microsoft Q&A: If I reset my computer, will Windows be installed?](https://learn.microsoft.com/en-us/answers/questions/5772418/if-i-reset-my-computer-will-windows-be-installed)
- Confidence: `high`

### 2. `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11`

- Title:
  - Change from `Fix nvlddmkm.sys Event ID 13 GPU Crashes` to `nvlddmkm Event ID 13 on Windows 11: Driver, Power, or GPU Fault?`
- Description:
  - Tighten to `Fix nvlddmkm Event ID 13 with a safe checklist for NVIDIA driver rollback, DDU cleanup, stock clocks, power, and thermal checks.`
- Content:
  - Add the common Event Viewer wording near the top because users often search the exact error string.
  - Add one short laptop-specific note to prefer OEM graphics packages before repeated generic NVIDIA installs.
- Internal links:
  - Link earlier to the Event ID 153 article and the GPU-vs-PSU thermal guide.
  - Add one reciprocal link from the RAM-vs-driver crash article where GPU crashes are discussed.
- Primary-source links:
  - [Microsoft Learn: Timeout Detection and Recovery](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/timeout-detection-and-recovery)
  - [Microsoft Learn: TDR registry keys](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/tdr-registry-keys)
  - [NVIDIA driver downloads](https://www.nvidia.com/en-us/drivers/)
  - [Display Driver Uninstaller](https://www.wagnardsoft.com/)
- Discussion links:
  - [Microsoft Q&A: nvlddmkm errors event id 13 and 14 when activating drivers after clean install](https://learn.microsoft.com/en-us/answers/questions/3255333/nvlddmkm-errors-event-id-13-and-14-when-activating)
  - [Microsoft Q&A: Need help with event id 153 nvlddmkm](https://learn.microsoft.com/en-us/answers/questions/5827474/need-help-with-event-id-153-nvlddmkm)
- Confidence: `medium-high`

### 3. `/blog/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen`

- Title:
  - Change from `Fix KMODE_EXCEPTION_NOT_HANDLED (0x1E) BSOD` to `KMODE_EXCEPTION_NOT_HANDLED (0x1E) on Windows 11: Driver, RAM, or Power-State Fix`
- Description:
  - Tighten to `Use Microsoft-based dump analysis, driver rollback, stock RAM testing, sleep-state checks, and system-file repair for 0x1E BSODs.`
- Content:
  - Add one short branch for crashes during idle, sleep, or resume.
  - Add one sentence near the dump-analysis section explaining that changing blamed modules across dumps can point back to memory instability.
- Internal links:
  - Link earlier to the RAM-vs-driver diagnostic article and the reinstall decision article.
  - Add one contextual link from the clock-watchdog article back to the 0x1E article around dump-first troubleshooting.
- Primary-source links:
  - [Microsoft Learn: Bug check 0x1E](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x1e--kmode-exception-not-handled)
  - [Microsoft Learn: Windows Debugger](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/)
  - [Microsoft Support: System File Checker](https://support.microsoft.com/en-us/windows/system-file-checker-9c1f1c3f-8f0f-4dbf-9a9a-6c7f2d5b8f4a)
- Discussion links:
  - [Microsoft Q&A: How to fix BSOD. STOP CODE: KMODE_EXCEPTION_NOT_HANDLED (0x1E)](https://learn.microsoft.com/en-us/answers/questions/5817856/how-to-fix-bsod-stop-code-kmode-exception-not-hand)
  - [Microsoft Q&A: KMODE_EXCEPTION_NOT_HANDLED Error after Updating to Windows 11 24H2](https://learn.microsoft.com/en-us/answers/questions/2283494/kmode-exception-not-handled-error-after-updating-t)
- Confidence: `medium-high`

## New-topic decision

No new topic is recommended in this run.

- The latest complete-window GSC evidence still supports updating three existing URLs instead of adding another article.
- The scratch password-manager query pocket may become actionable later, but the current article carries unsupported “tested” framing and would need source cleanup before any CTR-led push. Without a reconciled page/query export, it should not displace the stronger Windows opportunities.
- No existing evidence gap proves that a net-new article would outperform the three current pages already ranking in positions 4 to 20.

## Next measurement window

- First next check: **Monday, August 31, 2026**
  - Compare these three URLs against the **2026-08-15 to 2026-08-21** baseline after a fresh complete week is available.
- Second next check: **Monday, September 7, 2026**
  - If ranking remains in positions 5 to 12 but CTR stays weak, test only title/description changes before another body rewrite.
- Bing note:
  - Do not make a Bing-led editorial decision until a local export newer than **2026-07-21T09:42:39.659Z** exists.
