import os
import re
import json
from collections import defaultdict

ROOT = r"c:\Users\bunny\Downloads\00Resume\Building_Tech_Website"
ARTICLES_DIR = os.path.join(ROOT, "src", "content", "articles")
REPORT_PATH = os.path.join(ROOT, "research", "reports", "internal_graph_audit.json")

files = [f for f in os.listdir(ARTICLES_DIR) if f.endswith(".mdx")]

# Map slug -> list of inbound sources
inbound = defaultdict(list)
outbound = defaultdict(list)
all_slugs = set(f[:-4] for f in files)

for f in files:
    src_slug = f[:-4]
    full_path = os.path.join(ARTICLES_DIR, f)
    with open(full_path, "r", encoding="utf-8", errors="ignore") as file:
        content = file.read()
    
    # Match markdown links: [text](/blog/slug) or href="/blog/slug"
    links = re.findall(r'\[.*?\]\((/blog/([a-zA-Z0-9_-]+)[^)]*)\)', content)
    html_links = re.findall(r'href=["\'](/blog/([a-zA-Z0-9_-]+)[^"\']*)["\']', content)
    
    found_targets = set()
    for full_url, target_slug in links + html_links:
        if target_slug in all_slugs and target_slug != src_slug:
            found_targets.add(target_slug)
            inbound[target_slug].append(src_slug)
    
    outbound[src_slug] = list(found_targets)

# Sort by inbound count
results = []
for slug in sorted(all_slugs):
    in_count = len(set(inbound[slug]))
    out_count = len(outbound[slug])
    results.append({
        "slug": slug,
        "inboundCount": in_count,
        "outboundCount": out_count,
        "inboundFrom": list(set(inbound[slug])),
        "status": "ORPHAN" if in_count == 0 else ("UNDER_LINKED" if in_count < 4 else "WELL_CONNECTED")
    })

results.sort(key=lambda x: x["inboundCount"])

os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
with open(REPORT_PATH, "w", encoding="utf-8") as f:
    json.dump({
        "generatedAt": "2026-09-18T23:48:00Z",
        "totalArticles": len(all_slugs),
        "articles": results
    }, f, indent=2)

print(f"=== INTERNAL LINK GRAPH AUDIT ===")
print(f"Total Articles: {len(all_slugs)}")
orphans = [r for r in results if r["status"] == "ORPHAN"]
underlinked = [r for r in results if r["status"] == "UNDER_LINKED"]
print(f"Orphans (0 inbound links): {len(orphans)}")
print(f"Under-linked (<4 inbound links): {len(underlinked)}")

# Print status of key money assets
money_slugs = [
    "best-password-managers-in-2026-security-features-and-pricing-compared",
    "best-free-vpn-services-in-2026-complete-comparison-and-privacy-guide",
    "does-resetting-windows-remove-viruses-completely",
    "windows-11-volume-control-not-working-8-proven-fixes-for-2026"
]
print("\n--- Key Striking Assets Inbound Status ---")
for r in results:
    if r["slug"] in money_slugs:
        print(f"{r['slug']}: {r['inboundCount']} inbound links ({r['status']})")

with open(r"c:\Users\bunny\Downloads\00Resume\Building_Tech_Website\scripts\audit_internal_graph.py", "w", encoding="utf-8") as f:
    with open(__file__, "r", encoding="utf-8") as src:
        f.write(src.read())
