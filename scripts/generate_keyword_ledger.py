import os
import json
import re

ROOT = r"c:\Users\bunny\Downloads\00Resume\Building_Tech_Website"
ARTICLES_DIR = os.path.join(ROOT, "src", "content", "articles")
GSC_PATH = os.path.join(ROOT, "scratch", "forensic_gsc_raw.json")
LEDGER_PATH = os.path.join(ROOT, "research", "keyword_coverage_ledger.json")

def parse_frontmatter(content):
    match = re.match(r"^---\r?\n(.*?)\r?\n---", content, re.DOTALL)
    if not match:
        return {}
    fm_text = match.group(1)
    data = {}
    for line in fm_text.splitlines():
        line = line.strip()
        if ":" in line and not line.startswith("-"):
            k, v = line.split(":", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            data[k] = v
    return data

files = [f for f in os.listdir(ARTICLES_DIR) if f.endswith(".mdx")]
covered = []
target_queries = set()

for f in files:
    full_path = os.path.join(ARTICLES_DIR, f)
    with open(full_path, "r", encoding="utf-8", errors="ignore") as file:
        raw = file.read()
    data = parse_frontmatter(raw)
    slug = f[:-4]
    tq = data.get("target_query", data.get("targetQuery", data.get("title", ""))).lower().strip()
    if tq:
        target_queries.add(tq)
    
    covered.append({
        "slug": slug,
        "title": data.get("title", slug),
        "targetQuery": tq,
        "category": data.get("category", "tech"),
        "draft": data.get("draft", "false").lower() == "true",
        "hasQuickAnswer": "quickAnswer:" in raw,
        "hasFaq": "faq:" in raw,
    })

uncovered = []
if os.path.exists(GSC_PATH):
    with open(GSC_PATH, "r", encoding="utf-8") as f:
        gsc_data = json.load(f)
    rows = gsc_data.get("page_query_rows", [])
    
    query_agg = {}
    for r in rows:
        q = r.get("keys", ["", ""])[1].strip().lower()
        if not q:
            continue
        if q not in query_agg:
            query_agg[q] = {
                "query": q,
                "impressions": 0,
                "clicks": 0,
                "pages": set(),
                "positions": []
            }
        item = query_agg[q]
        item["impressions"] += int(r.get("impressions", 0))
        item["clicks"] += int(r.get("clicks", 0))
        item["pages"].add(r.get("keys", [""])[0].replace("https://www.praveentechworld.com", ""))
        item["positions"].append(float(r.get("position", 0)))
    
    for q, data in query_agg.items():
        is_targeted = any(tq in q or q in tq for tq in target_queries if tq)
        avg_pos = sum(data["positions"]) / len(data["positions"]) if data["positions"] else 0
        if not is_targeted and data["impressions"] >= 15:
            uncovered.append({
                "query": q,
                "impressions": data["impressions"],
                "clicks": data["clicks"],
                "avgPosition": round(avg_pos, 1),
                "rankedPages": list(data["pages"]),
                "recommendation": "HIGH_PRIORITY_DEDICATED_ASSET" if data["impressions"] >= 100 else "EXPAND_EXISTING_SECTION"
            })

uncovered.sort(key=lambda x: x["impressions"], reverse=True)

ledger = {
    "generatedAt": "2026-09-18T23:47:00Z",
    "totalCoveredArticles": len(covered),
    "totalUncoveredOpportunities": len(uncovered),
    "coveredArticles": covered,
    "uncoveredOpportunities": uncovered,
}

os.makedirs(os.path.dirname(LEDGER_PATH), exist_ok=True)
with open(LEDGER_PATH, "w", encoding="utf-8") as f:
    json.dump(ledger, f, indent=2)

print(f"=== KEYWORD COVERAGE LEDGER GENERATED ===")
print(f"Total Covered Articles: {len(covered)}")
print(f"Uncovered GSC Queries (>=15 imp): {len(uncovered)}")
print(f"Saved to: {LEDGER_PATH}")

with open(r"c:\Users\bunny\Downloads\00Resume\Building_Tech_Website\scripts\generate_keyword_ledger.py", "w", encoding="utf-8") as f:
    with open(__file__, "r", encoding="utf-8") as src:
        f.write(src.read())
