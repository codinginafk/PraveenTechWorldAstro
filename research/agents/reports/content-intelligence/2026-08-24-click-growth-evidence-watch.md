# Click-growth evidence watch — 2026-08-24 18:05 GST

## Evidence checked

- Latest available Google Search Console evidence in repo: [`research/agents/reports/content-intelligence/2026-08-24-targeted-click-sprint.md`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/reports/content-intelligence/2026-08-24-targeted-click-sprint.md)
  - Complete-week comparison used there: **2026-08-08 to 2026-08-14** vs **2026-08-15 to 2026-08-21** with a 3-day lag.
- Latest available Bing evidence in repo: [`research/agents/analytics-data.json`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/agents/analytics-data.json)
  - Bing snapshot was fetched on **2026-07-21**.
  - Crawl stats in that file run through **2026-07-20** and show `InIndex` rising to 69, but query volume is still too thin to overrule GSC.
- Local content inventory checked:
  - [`src/content/articles/does-resetting-windows-remove-viruses-completely.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/does-resetting-windows-remove-viruses-completely.mdx)
  - [`src/content/articles/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11.mdx)
  - [`src/content/articles/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen.mdx)
  - Supporting cluster and hub inventory:
    - [`src/content/hubs/windows-troubleshooting.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/hubs/windows-troubleshooting.mdx)
    - [`src/content/articles/will-reinstalling-windows-fix-blue-screen-errors.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/will-reinstalling-windows-fix-blue-screen-errors.mdx)
    - [`src/content/articles/pc-keeps-crashing-how-to-tell-if-it-s-a-ram-issue-or-a-bad-driver.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/pc-keeps-crashing-how-to-tell-if-it-s-a-ram-issue-or-a-bad-driver.mdx)
    - [`src/content/articles/pc-crashes-only-under-load-gpu-vs-psu-thermal-guide.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/pc-crashes-only-under-load-gpu-vs-psu-thermal-guide.mdx)
    - [`src/content/articles/how-to-fix-nvlddmkm-event-id-153-gpu-crashes.mdx`](/C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/src/content/articles/how-to-fix-nvlddmkm-event-id-153-gpu-crashes.mdx)
- Public discussion checked via browsing:
  - Microsoft Q&A malware/reset threads from **2026-08-06** and **2026-06-07**
  - Microsoft Q&A KMODE threads from **2026-06-07** and **2026-02-10**
  - Microsoft Q&A nvlddmkm Event ID 13 thread with newer follow-up comments on **2025-07-23**

## Trend

The strongest existing cluster is still **Windows recovery / GPU crash / BSOD troubleshooting**, not a new-topic gap.

- The latest complete-week GSC evidence already identified three striking-distance or near-striking-distance pages with weak CTR:
  - `/blog/does-resetting-windows-remove-viruses-completely` — **932 impressions, 0 clicks, 0.00% CTR, position 9.90**
  - `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11` — **476 impressions, 1 click, 0.21% CTR, position 11.79**
  - `/blog/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen` — **249 impressions, 2 clicks, 0.80% CTR, position 9.10**
- Bing is directionally consistent but stale. Its July 2026 query traffic is too sparse to justify a separate Bing-led topic. The crawl/index counts suggest discovery is improving, but not enough to change the editorial priority.
- The bodies of those three articles were already refreshed on **2026-08-24**. Because those rewrites are fresh, the next click-growth move should be **SERP packaging and tighter internal-link routing**, not another body rewrite.

## Affected URLs and recommended changes

### 1. `/blog/does-resetting-windows-remove-viruses-completely`

- Why it stays in scope:
  - Latest GSC report shows high impressions and poor CTR at a rank where snippet and title changes can matter.
  - Current public support threads still show users asking whether a reset is enough after malware or whether they need installation media.
- Recommended title change:
  - Test a title that surfaces the decision point earlier: `Does Resetting Windows Remove Viruses? When Reset Is Enough and When to Reinstall`
- Recommended description change:
  - Make the choice architecture explicit: `Learn what Keep my files, Remove everything, Defender Offline, and a clean reinstall can and cannot remove after a Windows malware infection.`
- Recommended content change:
  - Add one short section or callout near the top for `When Microsoft says to use installation media instead of Reset this PC`.
  - Add one short note clarifying that failed or looping resets are a separate recovery path, not proof the malware is gone.
- Recommended internal-link change:
  - Add or strengthen links from this article to the reinstall/BSOD guide and the BitLocker recovery loop guide.
  - Add one reciprocal link from `will-reinstalling-windows-fix-blue-screen-errors` back to this reset article where malware suspicion is mentioned.
- Primary sources:
  - [Reset your PC](https://support.microsoft.com/en-us/windows/reset-your-pc-0ef73740-b927-549b-b7c9-e6f2b48d275e)
  - [Reinstall Windows with installation media](https://support.microsoft.com/en-us/windows/reinstall-windows-with-the-installation-media-d8369486-3e33-7d9c-dccc-859e2b022fc7)
  - [Microsoft Defender Offline](https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-offline)
  - [Troubleshoot problems with detecting and removing malware](https://support.microsoft.com/en-us/defender/troubleshoot-problems-with-detecting-and-removing-malware)
- Forum evidence:
  - [Microsoft Q&A: i have a virus in my computer can you help me](https://learn.microsoft.com/en-us/answers/questions/5968721/i-have-a-virus-in-my-computer-can-you-help-me)
  - [Microsoft Q&A: How to fix computer stuck on “preparing” loop in a full reset](https://learn.microsoft.com/en-us/answers/questions/5913573/how-to-fix-computer-stuck-on-preparing-loop-in-a-f)
- Confidence: `high`

### 2. `/blog/how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11`

- Why it stays in scope:
  - Latest GSC report shows position **11.79** with near-zero CTR, which is the best current blend of ranking potential and weak packaging.
  - The forum pattern is still diagnostic: users keep posting the exact Event Viewer string and then asking whether the issue is driver corruption, a bad card, or Windows.
- Recommended title change:
  - Test a variant that matches the event string more closely: `nvlddmkm Event ID 13 on Windows 11: Driver, Power, or GPU Fault?`
- Recommended description change:
  - `Fix nvlddmkm Event ID 13 on Windows 11 with a safe checklist for driver rollback, DDU cleanup, stock clocks, thermals, power, and hardware checks.`
- Recommended content change:
  - Add one short subsection with the exact Event Viewer wording users search for: `The description for Event ID 13 from source nvlddmkm cannot be found`.
  - Add one short note for laptop readers to prefer OEM graphics packages when NVIDIA generic drivers conflict with vendor-tuned systems.
- Recommended internal-link change:
  - Link earlier in the article to the Event ID 153 page and the GPU-vs-PSU thermal guide.
  - Add one supporting link from the RAM-vs-driver crash page back to Event ID 13 using anchor text around GPU-related crashes.
- Primary sources:
  - [TDR registry keys](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/tdr-registry-keys)
  - [WDDM support for Timeout Detection and Recovery](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/timeout-detection-and-recovery)
  - [NVIDIA driver downloads](https://www.nvidia.com/en-us/drivers/)
  - [Display Driver Uninstaller](https://www.wagnardsoft.com/)
- Forum evidence:
  - [Microsoft Q&A: nvlddmkm errors event id 13 and 14 when activating drivers after clean install](https://learn.microsoft.com/en-us/answers/questions/3255333/nvlddmkm-errors-event-id-13-and-14-when-activating)
  - [Microsoft Q&A: Kernel problem](https://learn.microsoft.com/en-us/answers/questions/4376507/kernel-problem)
- Confidence: `medium-high`

### 3. `/blog/how-to-fix-kmode-exception-not-handled-0x1e-blue-screen`

- Why it stays in scope:
  - Latest GSC report shows **249 impressions**, **0.80% CTR**, **position 9.10**.
  - Recent Microsoft Q&A threads show users still conflating 0x1E with a single bad driver when recent cases also point to idle-state transitions, virtualization, and stock-vs-overclock validation.
- Recommended title change:
  - Test a clearer SERP-facing variant: `KMODE_EXCEPTION_NOT_HANDLED (0x1E) on Windows 11: Driver, RAM, or Power-State Fix`
- Recommended description change:
  - `Fix KMODE_EXCEPTION_NOT_HANDLED (0x1E) with Microsoft-based dump analysis, driver rollback, stock RAM testing, sleep-state checks, and system-file repair.`
- Recommended content change:
  - Add one short branch for `crashes during idle, sleep, or resume` and mention virtualization/security features only as a diagnostic clue, not a blanket cause.
  - Add one short sentence near the WinDbg section explaining that changing module names across dumps can point back to memory instability.
- Recommended internal-link change:
  - Add an earlier link to the RAM-vs-driver diagnosis article and the reinstall decision article.
  - Add one contextual link from the clock-watchdog article back to KMODE around dump-first troubleshooting.
- Primary sources:
  - [Bug Check 0x1E (KMODE_EXCEPTION_NOT_HANDLED)](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x1e--kmode-exception-not-handled)
  - [Windows Debugger documentation](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/)
  - [System File Checker](https://support.microsoft.com/en-us/windows/system-file-checker-9c1f1c3f-8f0f-4dbf-9a9a-6c7f2d5b8f4a)
- Forum evidence:
  - [Microsoft Q&A: KMODE_EXCEPTION_NOT_HANDLED (1e) BSOD persisting Despite Troubleshoots](https://learn.microsoft.com/en-us/answers/questions/5913593/kmode-exception-not-handled-%281e%29-bsod-persisting-d)
  - [Microsoft Q&A: kmode_exception_not handled...](https://learn.microsoft.com/en-us/answers/questions/5768628/kmode-exception-not-handled)
- Confidence: `medium-high`

## New-topic decision

No new topic is recommended in this run.

- The latest available GSC evidence already shows three existing URLs in or near the actionable rank band.
- The current forum/support discussions map cleanly to those existing pages.
- The local inventory already covers the adjacent intents: reinstall vs reset, RAM vs driver, GPU vs PSU, Event ID 153, BitLocker loop, and clock watchdog.

## Next measurement window

- First measurement window: **Monday, August 31, 2026**
  - Compare the refreshed pages against the **2026-08-15 to 2026-08-21** baseline once a new complete week is available.
- Second measurement window: **Monday, September 7, 2026**
  - If rankings hold in positions 5 to 12 but CTR stays weak, test only title/description changes next.
- Bing follow-up:
  - Do not make a Bing-led editorial decision until a fresher Bing export than **2026-07-21** is available.
