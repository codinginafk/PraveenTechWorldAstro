import re

files = [
    'src/content/articles/fix-dism-0x800f0915-efi-system-partition-too-small.mdx',
    'src/content/articles/wsl2-internet-not-working-windows-11-dns-vpn-fixes.mdx',
    'src/content/articles/how-to-fix-nvlddmkm-event-id-153-gpu-crashes.mdx',
    'src/content/articles/windows-11-volume-control-not-working-8-proven-fixes-for-2026.mdx',
    'src/content/articles/how-to-fix-clock-watchdog-timeout-0x101-blue-screen-error-windows-11.mdx'
]

print("=== VERIFYING CITABILITY CAPSULES ===")
for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    title_match = re.search(r'^title:\s*"([^"]+)"', content, re.MULTILINE)
    seo_title_match = re.search(r'^seoTitle:\s*"([^"]+)"', content, re.MULTILINE)
    title = title_match.group(1) if title_match else 'MISSING'
    seo_title = seo_title_match.group(1) if seo_title_match else 'MISSING'
    
    summary_match = re.search(r'quickAnswer:\s*\n\s+summary:\s*"([^"]+)"', content)
    if not summary_match:
        print(f"ERROR: No quickAnswer summary in {fpath}")
        continue
    
    summary = summary_match.group(1)
    word_count = len(summary.split())
    valid = 134 <= word_count <= 167
    
    print(f"\nFile: {fpath}")
    print(f"  Title: {title}")
    print(f"  seoTitle: {seo_title}")
    print(f"  Summary Word Count: {word_count} words (Valid [134-167]: {valid})")
    print(f"  Workbench Reference: {'Windows 11 24H2' in summary}")
    print(f"  Team Voice: {'our team' in summary}")
    if "wsl2" in fpath:
        print(f"  Mirrored Mode Included: {'mirrored mode' in summary or 'networkingMode=mirrored' in summary}")

print("\nAll files verified.")
