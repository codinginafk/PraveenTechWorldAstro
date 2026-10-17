#!/usr/bin/env python3
"""
scripts/apply_cluster_upgrades.py
Systematically upgrades the 9 high-opportunity articles:
1. TMOG (Task Manager OG download)
2. 0x800f0915 DISM error
3. System Thread Exception Not Handled 0x7E
4. Clock Watchdog Timeout 0x101
5. nvlddmkm Event ID 153 GPU crash
6. Best Business Password Managers 2026 Pricing
7. Windows WSL2 DNS Issue
8. inpoutx64 Windows crash
9. vmmemWSL High Memory Usage
"""

import os
import sys
import re

ROOT_DIR = r"C:\Users\bunny\Downloads\00Resume\Building_Tech_Website"
ARTICLES_DIR = os.path.join(ROOT_DIR, "src", "content", "articles")
KW_TOOL_PATH = r"C:\Users\bunny\OneDrive\Desktop\KeywordResearch"

sys.path.insert(0, ROOT_DIR)
sys.path.insert(0, KW_TOOL_PATH)
import app as kw_app

sys.stdout.reconfigure(encoding='utf-8')

TODAY = "2026-10-13"

TARGETS = [
    {
        "slug": "tmog-dave-plummer-cross-platform-task-manager-guide",
        "query": "tmog task manager download",
        "title": "TMOG Task Manager Download: 5 Real Benchmarks (2026)",
        "seoTitle": "TMOG Task Manager Download: 5 Real Benchmarks (2026)",
        "description": "Download Dave Plummer's TMOG (Task Manager OG) safely. Verified benchmarks, 60Hz telemetry, code signatures, and comparison against Windows Task Manager.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "fix-dism-0x800f0915-efi-system-partition-too-small",
        "query": "0x800f0915 dism error",
        "title": "0x800f0915 DISM Error: 5 Tested Fixes on Windows 11 (2026)",
        "seoTitle": "0x800f0915 DISM Error: 5 Tested Fixes on Windows 11 (2026)",
        "description": "Fix DISM error 0x800f0915 and update rollbacks on Windows 11. Step-by-step repair for WinSxS manifests, full EFI partitions, and font cache corruption.",
        "widget": '<ErrorLookupBar initialCode="0x800f0915" title="Instant DISM & CBS Error Code Lookup" subtitle="Search verified PowerShell and mountvol commands for 0x800f0915 and update rollbacks." />',
        "anchor": "## What Causes DISM Error 0x800f0915"
    },
    {
        "slug": "how-to-fix-system-thread-exception-not-handled-0x7e",
        "query": "system thread exception not handled 0x7e",
        "title": "System Thread Exception Not Handled: 5 Fixes for 0x7e (2026)",
        "seoTitle": "System Thread Exception Not Handled: 5 Fixes for 0x7e (2026)",
        "description": "Encountering SYSTEM_THREAD_EXCEPTION_NOT_HANDLED (0x7E)? Identify the failing .sys driver in WinDbg, escape boot loops, and repair system files cleanly.",
        "widget": '<ErrorLookupBar initialCode="0x0000007E" title="Instant BSOD Stop Code & Driver Lookup" subtitle="Search bug check 0x7E, nvlddmkm.sys, and kernel dump analysis commands." />',
        "anchor": "## Step 1: Identify What Failed"
    },
    {
        "slug": "how-to-fix-clock-watchdog-timeout-0x101-blue-screen-error-windows-11",
        "query": "clock watchdog timeout 0x101",
        "title": "Clock Watchdog Timeout 0x101: 5 Tested Fixes in 2026",
        "seoTitle": "Clock Watchdog Timeout 0x101: 5 Tested Fixes in 2026",
        "description": "Fix CLOCK_WATCHDOG_TIMEOUT (0x101) crashes in Windows 11. Learn why it survives reinstalls, how to isolate CPU cores in WinDbg, and BIOS voltage fixes.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "how-to-fix-nvlddmkm-event-id-153-gpu-crashes",
        "query": "nvlddmkm event id 153",
        "title": "nvlddmkm Event ID 153 GPU Crash: 5 Tested Fixes (2026)",
        "seoTitle": "nvlddmkm Event ID 153 GPU Crash: 5 Tested Fixes (2026)",
        "description": "nvlddmkm Event ID 153 crashing games? 5 verified fixes: reseat PCIe slot, toggle HAGS, reset VRAM clocks, and clean install NVIDIA drivers with DDU.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "best-password-managers-in-2026-security-features-and-pricing-compared",
        "query": "best business password managers 2026 pricing",
        "title": "Best Business Password Managers 2026 Pricing: 5 Tested",
        "seoTitle": "Best Business Password Managers 2026 Pricing: 5 Tested",
        "description": "Compare best business password managers in 2026: verified pricing ($3.75-$7.99/user/mo), SSO add-on fees, and zero-knowledge encryption benchmarks.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "wsl2-internet-not-working-windows-11-dns-vpn-fixes",
        "query": "windows wsl2 dns issue",
        "title": "Fix Windows WSL2 DNS Issue: 5 Tested Steps in 2026",
        "seoTitle": "Fix Windows WSL2 DNS Issue: 5 Tested Steps in 2026",
        "description": "Fix Windows WSL2 DNS issues and no-internet errors in 5 steps. Complete runbook for dnsTunneling, mirrored networking, and corporate VPN MTU fixes.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "how-to-fix-windows-11-kb5121003-inpoutx64-crash",
        "query": "inpoutx64 windows crash",
        "title": "inpoutx64 Windows Crash: 3 Tested Driver Fixes (2026)",
        "seoTitle": "inpoutx64 Windows Crash: 3 Tested Driver Fixes (2026)",
        "description": "Games crashing after Windows 11 update KB5121003? Disable the legacy inpoutx64.sys anti-cheat driver with our reversible 2-minute registry runbook.",
        "widget": '<ErrorLookupBar initialCode="inpoutx64" title="Instant Windows Service & Crash Fixer" subtitle="Lookup inpoutx64.sys service errors, registry fixes, and game crash repairs." />',
        "anchor": "## 1. What"
    },
    {
        "slug": "vmmemwsl-high-memory-cpu-usage-windows-11-fix",
        "query": "vmmemwsl high memory usage",
        "title": "vmmemWSL High Memory Usage: 3 Tested Fixes for 2026",
        "seoTitle": "vmmemWSL High Memory Usage: 3 Tested Fixes for 2026",
        "description": "Fix vmmemWSL high memory usage on Windows 11 24H2. We test autoMemoryReclaim, dropcache, sparse VHDX, and custom .wslconfig limits on developer rigs.",
        "widget": '<ErrorLookupBar initialCode="vmmemwsl" title="Instant WSL & Memory Fixer" subtitle="Lookup vmmemWSL memory limits, .wslconfig commands, and reclaim flags." />',
        "anchor": "## 1."
    }
]

def update_frontmatter_field(fm_text, key, new_val):
    pattern = rf"^({key}:\s*)(.*)$"
    if re.search(pattern, fm_text, flags=re.MULTILINE):
        return re.sub(pattern, rf'\g<1>"{new_val}"', fm_text, flags=re.MULTILINE)
    else:
        return fm_text.rstrip() + f'\n{key}: "{new_val}"\n'

def process_one(data, idx, total):
    slug = data["slug"]
    filepath = os.path.join(ARTICLES_DIR, f"{slug}.mdx")
    if not os.path.exists(filepath):
        filepath = os.path.join(ARTICLES_DIR, f"{slug}.md")
    if not os.path.exists(filepath):
        print(f"[{idx}/{total}] ERROR: File not found for {slug}")
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read().replace('\r\n', '\n')

    score, notes = kw_app.score_title(data["title"], data["query"], platform="google")
    print(f"[{idx}/{total}] Upgrading: {slug}")
    print(f"   Target Query: '{data['query']}'")
    print(f"   New Title: '{data['title']}' ({len(data['title'])} chars) | Score: {score}/100")

    parts = content.split('---\n', 2)
    if len(parts) < 3:
        print(f"   ERROR: Malformed frontmatter in {slug}")
        return False

    header, fm, body = parts[0], parts[1], parts[2]

    # Update frontmatter
    fm = update_frontmatter_field(fm, "title", data["title"])
    fm = update_frontmatter_field(fm, "seoTitle", data["seoTitle"])
    fm = update_frontmatter_field(fm, "description", data["description"])
    fm = update_frontmatter_field(fm, "updatedDate", TODAY)

    # Inject widget if defined
    if data.get("widget") and data.get("anchor"):
        anchor = data["anchor"]
        match = re.search(rf"^##\s+.*{re.escape(anchor.replace('##', '').strip())}.*$", body, flags=re.MULTILINE)
        if match and data["widget"] not in body:
            matched_heading = match.group(0)
            body = body.replace(matched_heading, f"{data['widget']}\n\n{matched_heading}", 1)
            print(f"   Injected widget above: '{matched_heading[:40]}...'")

    new_content = f"{header}---\n{fm}---\n{body}"

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"   SUCCESS: Saved with updatedDate: {TODAY}\n")
    return True

def main():
    print(f"=== Starting Optimization for {len(TARGETS)} Opportunity Articles ===\n")
    successes = 0
    for idx, item in enumerate(TARGETS, 1):
        if process_one(item, idx, len(TARGETS)):
            successes += 1
    print(f"=== Completed: {successes}/{len(TARGETS)} articles upgraded successfully! ===")

if __name__ == "__main__":
    main()
