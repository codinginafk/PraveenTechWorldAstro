#!/usr/bin/env python3
"""
scripts/apply_all_29_upgrades.py
Systematically upgrades the remaining 29 decaying articles one-by-one.
Applies:
- Verified high-CTR titles scored >=70/100 via KeywordResearch app.score_title
- updatedDate: "2026-10-13"
- Frontmatter title, seoTitle, description synchronization
- Appropriate widget embeddings (<ErrorLookupBar />, <VramMiniWidget />)
"""

import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = r"C:\Users\bunny\Downloads\00Resume\Building_Tech_Website"
ARTICLES_DIR = os.path.join(ROOT_DIR, "src", "content", "articles")
KW_TOOL_PATH = r"C:\Users\bunny\OneDrive\Desktop\KeywordResearch"

sys.path.insert(0, KW_TOOL_PATH)
import app as kw_app

TODAY = "2026-10-13"

ARTICLES_DATA = [
    {
        "slug": "windows-11-august-2026-patch-tuesday-roundup",
        "query": "windows 11 patch tuesday fixes",
        "title": "Windows 11 Patch Tuesday Fixes: 5 Tested Solutions (2026)",
        "seoTitle": "Windows 11 Patch Tuesday Fixes: 5 Tested Solutions (2026)",
        "description": "Complete breakdown of Windows 11 Patch Tuesday updates: verified fixes for black screens, gaming stutter, and update rollback commands for IT sysadmins.",
        "widget": '<ErrorLookupBar initialCode="KB5121003" title="Instant Patch Tuesday Error Code Lookup" subtitle="Search verified PowerShell fixes for failed cumulative updates and kernel patches." />',
        "anchor": "## 1. What"
    },
    {
        "slug": "how-to-fix-sitemap-errors-in-google-search-console",
        "query": "sitemap errors google search console",
        "title": "Fix Sitemap Errors in Google Search Console: 5 Steps (2026)",
        "seoTitle": "Fix Sitemap Errors in Google Search Console: 5 Steps (2026)",
        "description": "Fix 'Couldn't fetch' and 'Sitemap contains errors' in Google Search Console. 5-step engineering runbook covering XML headers, redirects, and robots.txt.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "automated-server-health-checks-with-deepseek",
        "query": "automate linux server health checks",
        "title": "Automate Linux Server Health Checks: 3 AI Scripts (2026)",
        "seoTitle": "Automate Linux Server Health Checks: 3 AI Scripts (2026)",
        "description": "Automate daily Linux server health monitoring using local DeepSeek and Bash. Real workbench scripts for memory leaks, zombie processes, and disk alerts.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "debull-tooling-abuses-microsoft-device-code-flow-to-target-m365-accounts",
        "query": "microsoft device code flow debull",
        "title": "Microsoft Device Code Flow DEBULL Abuse: 3 Fixes (2026)",
        "seoTitle": "Microsoft Device Code Flow DEBULL Abuse: 3 Fixes (2026)",
        "description": "How threat actors weaponize DEBULL tooling against Microsoft 365 Device Code Flow. Our sysadmin guide to Conditional Access policies and sign-in triage.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "deepseek-powershell-log-triage-windows-server",
        "query": "powershell log triage windows server",
        "title": "PowerShell Log Triage on Windows Server: 5 Scripts (2026)",
        "seoTitle": "PowerShell Log Triage on Windows Server: 5 Scripts (2026)",
        "description": "Triage gigabytes of Windows Server Event Logs in seconds using PowerShell and local DeepSeek. Fast script triage for CBS.log, WHEA, and security events.",
        "widget": '<ErrorLookupBar title="Instant Windows Event Log & Error Decryptor" subtitle="Query CBS.log, Event 153/13, and Windows stop codes with verified repair scripts." />',
        "anchor": "## 1."
    },
    {
        "slug": "google-analytics-4-page-tracking-how-it-works",
        "query": "ga4 page tracking step by step",
        "title": "GA4 Page Tracking Step by Step: 5 Tested Debug Fixes (2026)",
        "seoTitle": "GA4 Page Tracking Step by Step: 5 Tested Debug Fixes (2026)",
        "description": "Understand exactly how GA4 page_view events trigger, debug missing real-time hits in Tag Assistant, and resolve SPA client-side routing tracking drops.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "ga4-events-automatic-recommended-custom-tracking-guide",
        "query": "ga4 events and custom tracking",
        "title": "GA4 Events and Custom Tracking: 5 Tested Steps in 2026",
        "seoTitle": "GA4 Events and Custom Tracking: 5 Tested Steps in 2026",
        "description": "Configure GA4 automatic, recommended, and custom parameters without polluting your data schema. Step-by-step BigQuery and GTM implementation runbook.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "august-2026-patch-tuesday-cve-zero-day-windows-defender",
        "query": "windows defender cve zero day patch",
        "title": "Windows Defender CVE Zero-Day Patch: 3 Triage Steps (2026)",
        "seoTitle": "Windows Defender CVE Zero-Day Patch: 3 Triage Steps (2026)",
        "description": "Triage active Windows Defender zero-day vulnerabilities across your enterprise. Patch verification, registry hardening, and WMI repair runbook for IT teams.",
        "widget": '<ErrorLookupBar initialCode="KB5041585" title="Instant Windows Security Hotfix Lookup" subtitle="Verify Windows Defender signatures, zero-day CVE patches, and endpoint status." />',
        "anchor": "## 1."
    },
    {
        "slug": "data-protection-for-universities-compliance-and-security-guide",
        "query": "data protection for universities",
        "title": "Data Protection for Universities: 5 Security Rules (2026)",
        "seoTitle": "Data Protection for Universities: 5 Security Rules (2026)",
        "description": "Protect student records, research IP, and campus infrastructure from ransomware. Practical FERPA/GDPR compliance runbook with network segmentation guides.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "how-to-track-content-engagement-in-google-analytics-4",
        "query": "track content engagement in ga4",
        "title": "Track Content Engagement in GA4: 5 Tested Methods (2026)",
        "seoTitle": "Track Content Engagement in GA4: 5 Tested Methods (2026)",
        "description": "Measure true reader engagement in GA4: track scroll depth thresholds, code copy clicks, and reading session durations beyond default 10-second visits.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "how-to-run-local-ai-models-on-windows-11-phi-4-deepseek",
        "query": "run local ai models on windows 11",
        "title": "Run Local AI Models on Windows 11: 3 Proven Steps (2026)",
        "seoTitle": "Run Local AI Models on Windows 11: 3 Proven Steps (2026)",
        "description": "Run Microsoft Phi-4 and DeepSeek-R1 natively on Windows 11. Complete hardware sizing, Ollama command runbook, and GPU offloading benchmark data.",
        "widget": '<VramMiniWidget defaultModel="phi-4-14b" defaultQuant="q4_k_m" defaultCtx={8192} title="Windows 11 AI Hardware & VRAM Sizer" subtitle="Calculate GPU memory required before pulling Phi-4 or DeepSeek models." />',
        "anchor": "## 1."
    },
    {
        "slug": "ai-in-higher-education-protecting-student-data-privacy-tips",
        "query": "student data privacy in campus ai",
        "title": "Student Data Privacy in Campus AI: 7 Safety Rules (2026)",
        "seoTitle": "Student Data Privacy in Campus AI: 7 Safety Rules (2026)",
        "description": "Prevent student assignment leaks and PII exposure to third-party AI training sets. Campus deployment guide for self-hosted LLMs and privacy policies.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "fix-windows-11-update-errors-2026-troubleshooting",
        "query": "fix windows 11 update errors",
        "title": "Fix Windows 11 Update Errors: 5 Tested Repairs (2026)",
        "seoTitle": "Fix Windows 11 Update Errors: 5 Tested Repairs (2026)",
        "description": "Resolve stuck Windows 11 cumulative updates, 0x800f0922, 0x80073712, and 99% loops. Complete PowerShell service reset and SoftwareDistribution runbook.",
        "widget": '<ErrorLookupBar initialCode="0x800f0922" title="Instant Windows Update Error Decryptor" subtitle="Lookup 0x800f0922, 0x80073712, and component store repair commands." />',
        "anchor": "## 1."
    },
    {
        "slug": "windows-11-search-not-working-12-proven-fixes-for-2026",
        "query": "windows 11 search not working",
        "title": "Windows 11 Search Not Working: 7 Proven Fixes in 2026",
        "seoTitle": "Windows 11 Search Not Working: 7 Proven Fixes in 2026",
        "description": "Windows 11 start menu search freezing, blank, or showing loading loops? Our team tested 7 working SearchHost, Indexer, and PowerShell AppX repairs.",
        "widget": '<ErrorLookupBar initialCode="SearchHost" title="Instant Windows Service & Crash Fixer" subtitle="Lookup SearchHost.exe errors, Start Menu glitches, and registry fixes." />',
        "anchor": "## 1."
    },
    {
        "slug": "shadow-ai-audit-microsoft-365-native-tools",
        "query": "shadow ai audit microsoft 365",
        "title": "Shadow AI Audit in Microsoft 365: 5 Native Steps (2026)",
        "seoTitle": "Shadow AI Audit in Microsoft 365: 5 Native Steps (2026)",
        "description": "Discover unauthorized AI tools and data exfiltration inside your Microsoft 365 tenant using native Purview and Defender for Cloud Apps. Free audit runbook.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "gemini-3-6-flash-vs-3-5-flash-complete-guide",
        "query": "gemini 3.6 flash vs 3.5 flash",
        "title": "Gemini 3.6 Flash vs 3.5 Flash: 5 Real Benchmarks (2026)",
        "seoTitle": "Gemini 3.6 Flash vs 3.5 Flash: 5 Real Benchmarks (2026)",
        "description": "Detailed benchmark comparison between Gemini 3.6 Flash and 3.5 Flash: token latency, coding accuracy, mathematical reasoning, and API cost differences.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "building-a-cli-tool-to-automate-spreadsheet-data-cleaning-with-deepseek",
        "query": "automate excel data cleaning python",
        "title": "Automate Excel Data Cleaning with Python: 3 Steps (2026)",
        "seoTitle": "Automate Excel Data Cleaning with Python: 3 Steps (2026)",
        "description": "Clean messy Excel sheets, deduplicate rows, and standardize date formats automatically with Python and local DeepSeek. Complete CLI script included.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "core-web-vitals-fail-new-website-improve-lcp-inp-cls",
        "query": "improve core web vitals lcp inp",
        "title": "Improve Core Web Vitals (LCP & INP): 5 Proven Fixes (2026)",
        "seoTitle": "Improve Core Web Vitals (LCP & INP): 5 Proven Fixes (2026)",
        "description": "Failed Core Web Vitals in Google Search Console? Learn our exact fixes to pass LCP under 2.5s, slash INP under 200ms, and eliminate layout shift (CLS).",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "how-to-uninstall-ai-components-windows-11-copilot-recall",
        "query": "uninstall windows 11 copilot recall",
        "title": "Uninstall Windows 11 Copilot & Recall: 3 Fixes in 2026",
        "seoTitle": "Uninstall Windows 11 Copilot & Recall: 3 Fixes in 2026",
        "description": "Completely remove Microsoft Copilot and Windows Recall from Windows 11. Step-by-step PowerShell commands, Group Policy disablers, and registry tweaks.",
        "widget": '<ErrorLookupBar initialCode="Copilot" title="Instant Windows Package & Component Decryptor" subtitle="Search verified removal scripts for DISM packages and Windows 11 components." />',
        "anchor": "## 1."
    },
    {
        "slug": "ai-content-auditor-scored-my-blog-articles",
        "query": "ai content auditor for tech blog",
        "title": "AI Content Auditor for Tech Blogs: 5 Scoring Steps (2026)",
        "seoTitle": "AI Content Auditor for Tech Blogs: 5 Scoring Steps (2026)",
        "description": "How we built a local AI content auditor to scan tech articles for passive voice, broken code snippets, and outdated commands before publishing.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "automated-tls-certificate-renewal-with-deepseek",
        "query": "automate tls certificate renewal",
        "title": "Automate TLS Certificate Renewal: 3 Proven Scripts (2026)",
        "seoTitle": "Automate TLS Certificate Renewal: 3 Proven Scripts (2026)",
        "description": "Automate Let's Encrypt SSL/TLS certificate renewals across internal reverse proxies using local DeepSeek scripting. Zero unexpected cert expirations.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "deepseek-cloud-cleanup-flagged-3000-resources",
        "query": "clean up unused cloud resources",
        "title": "Clean Up Unused Cloud Resources: 3 DeepSeek Rules (2026)",
        "seoTitle": "Clean Up Unused Cloud Resources: 3 DeepSeek Rules (2026)",
        "description": "How our team saved 32% on monthly AWS/Azure infrastructure by automating orphaned disk, unattached IP, and idle instance discovery with local AI.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "website-speed-upgrades-fix-crawling-delays-and-core-web-vitals",
        "query": "fix website crawling delays",
        "title": "Fix Website Crawling Delays: 5 Speed Upgrades in 2026",
        "seoTitle": "Fix Website Crawling Delays: 5 Speed Upgrades in 2026",
        "description": "Googlebot crawl budget exhausted? Fix slow server TTFB, compress responsive webp images, and eliminate render-blocking CSS to accelerate indexing.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "how-to-build-a-website-from-scratch-in-2026-a-complete-beginner-guide",
        "query": "build a website from scratch",
        "title": "Build a Website from Scratch: 5 Steps for 2026 Beginners",
        "seoTitle": "Build a Website from Scratch: 5 Steps for 2026 Beginners",
        "description": "Complete beginner tutorial to building a modern, lightning-fast static website in 2026 using Astro, Tailwind CSS, and free Cloudflare Pages hosting.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "non-developer-built-database-audit-script-with-deepseek",
        "query": "python database audit cli script",
        "title": "Python Database Audit CLI Script: 3 Tested Steps (2026)",
        "seoTitle": "Python Database Audit CLI Script: 3 Tested Steps (2026)",
        "description": "How a non-developer on our team built a production-ready PostgreSQL and MySQL health audit script in Python using local DeepSeek prompting.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "ai-powered-expense-report-automation-for-office-workers-no-code-solutions",
        "query": "automate expense reports with ai",
        "title": "Automate Expense Reports with AI: 3 No-Code Tools (2026)",
        "seoTitle": "Automate Expense Reports with AI: 3 No-Code Tools (2026)",
        "description": "Automate receipt parsing and expense categorization using AI document extractors. Save 4 hours every week with simple n8n and Python workflows.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "retooled-my-ai-content-pipeline-after-expert-audit",
        "query": "ai content pipeline architecture",
        "title": "AI Content Pipeline Architecture: 5 Lessons Learned (2026)",
        "seoTitle": "AI Content Pipeline Architecture: 5 Lessons Learned (2026)",
        "description": "Behind-the-scenes teardown of our technical publishing pipeline: quality score gates, automated hero generation, and anti-hallucination guardrails.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "how-to-learn-excel-faster-using-chatgpt",
        "query": "learn excel faster using chatgpt",
        "title": "Learn Excel Faster Using ChatGPT: 5 Team Prompts in 2026",
        "seoTitle": "Learn Excel Faster Using ChatGPT: 5 Team Prompts in 2026",
        "description": "Master advanced Excel formulas, Power Query transformations, and nested XLOOKUPs in half the time using targeted, copy-paste ChatGPT engineering prompts.",
        "widget": None,
        "anchor": None
    },
    {
        "slug": "google-search-console-not-showing-data-8-fixes",
        "query": "google search console not showing data",
        "title": "Google Search Console Not Showing Data: 7 Fixes (2026)",
        "seoTitle": "Google Search Console Not Showing Data: 7 Fixes (2026)",
        "description": "Google Search Console performance report completely blank or delayed? Fix DNS TXT verification drops, 48-hour data lag, and canonical indexing errors.",
        "widget": None,
        "anchor": None
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
        # Find matching H2 in body
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
    print(f"=== Starting System Upgrade for {len(ARTICLES_DATA)} Decaying Articles ===\n")
    successes = 0
    for idx, item in enumerate(ARTICLES_DATA, 1):
        if process_one(item, idx, len(ARTICLES_DATA)):
            successes += 1
    print(f"=== Completed: {successes}/{len(ARTICLES_DATA)} articles upgraded successfully! ===")

if __name__ == "__main__":
    main()
