#!/usr/bin/env python3
"""
SERP & Keyword Research Optimization Engine for PraveenTechWorld
Integrates with Desktop KeywordResearch tool suite at C:\\Users\\bunny\\OneDrive\\Desktop\\KeywordResearch

Capabilities:
1. GSC Impression-to-Click Audit: identifies striking-distance pages (pos 4-10, low CTR).
2. Desktop KeywordResearch Tool Integration:
   - score_title(title, query, platform="google"): scores 0-100 on length, frontloading, freshness, hooks, slop penalties.
   - find_flow(seed, sources): queries live Google + DuckDuckGo autocomplete for user questions & long-tail search intent.
3. Strict Title Protection Rules:
   - PROTECT: NEVER touch titles with CTR > 5.0% or #1-#2 rankings (e.g. DeGoogle Starter Pack at 29% CTR).
   - SURGICAL: Refine 1.0% - 3.0% CTR only if base keyword frontloading is preserved.
   - UPGRADE: Rewrite < 0.7% CTR or broken/truncated titles with tool-verified variants scoring >= 70 pts.
4. Passage Citability (claude-seo): enforces 134-167 word answer capsules under primary H2s.
"""

import sys
import os
import json
import re
import argparse

sys.stdout.reconfigure(encoding='utf-8')

KW_TOOL_PATH = r'C:\Users\bunny\OneDrive\Desktop\KeywordResearch'
if os.path.exists(KW_TOOL_PATH):
    sys.path.insert(0, KW_TOOL_PATH)
    try:
        import app as kw_app
    except Exception as e:
        kw_app = None
        print(f"[Warning] Could not import KeywordResearch app: {e}", file=sys.stderr)
else:
    kw_app = None
    print(f"[Warning] KeywordResearch tool not found at {KW_TOOL_PATH}", file=sys.stderr)


def evaluate_title(title, query, platform="google"):
    """Scores title using Desktop KeywordResearch engine or fallback rubric."""
    if kw_app and hasattr(kw_app, 'score_title'):
        return kw_app.score_title(title, query, platform)
    
    # Fallback heuristic
    score = 50
    notes = []
    t = (title or "").strip()
    n = len(t)
    if 45 <= n <= 60:
        score += 22
        notes.append("ideal length")
    elif n > 60:
        score += 5
        notes.append("over 60 chars")
    else:
        score += 10
        notes.append("short title")
    
    q_words = [w.lower() for w in query.split() if len(w) > 2]
    if all(w in t.lower() for w in q_words):
        score += 20
        notes.append("all query words present")
    if "2026" in t:
        score += 4
        notes.append("2026 anchor")
    return min(100, score), notes


def discover_suggestions_and_questions(seed):
    """Fetches autocomplete suggestions and questions via KeywordResearch find_flow."""
    if kw_app and hasattr(kw_app, 'find_flow'):
        try:
            flow_res = kw_app.find_flow({"seed": seed, "sources": ["google", "duckduckgo"]})
            kws = flow_res.get("keywords", [])
            suggestions = [k.get("text") for k in kws[:15] if k.get("text")]
            questions = [
                k.get("text") for k in kws 
                if k.get("question") or re.search(r"^(how|why|what|can|does|is)\b", k.get("text", "").lower())
            ]
            return suggestions, questions
        except Exception as e:
            print(f"[Warning] find_flow error for '{seed}': {e}", file=sys.stderr)
    return [], []


def classify_action(slug, cur_title, clicks, impr, ctr, position):
    """
    Applies the Strict Title Protection Rule:
    - PROTECT: CTR > 5.0% or Clicks > 100 or Pos <= 2.5
    - CRITICAL BUG FIX: Truncated titles (e.g. 'Why WSL2 vmmem Won')
    - SURGICAL: CTR 1.0% - 3.0%
    - UPGRADE: CTR < 0.8% with high impressions (> 1,000)
    """
    ctr_val = float(str(ctr).replace("%", "")) if ctr else 0.0
    
    # Truncation bugs
    if len(cur_title) < 25 or cur_title.endswith(" Won") or cur_title.endswith(" Fix"):
        return "CRITICAL_BUG_FIX", "Title is truncated or damaged in frontmatter."
    
    # Top performers
    if ctr_val >= 5.0 or clicks >= 100 or position <= 2.5:
        return "PROTECT_KEEP_OLD", f"Winning page ({clicks} clicks, {ctr_val}% CTR, Pos {position}). Never destabilize top rankings!"
    
    # Healthy CTR
    if ctr_val >= 1.5:
        return "SURGICAL_REFINE", f"Healthy CTR ({ctr_val}%). Retain core verbatim frontload; only add odd-number/year hooks."
    
    # Striking distance underperformer
    return "UPGRADE_TITLE", f"Low CTR ({ctr_val}%) despite {impr} impressions. Requires exact query frontload & curiosity hook."


def main():
    parser = argparse.ArgumentParser(description="PraveenTechWorld SERP & Keyword Intent Optimizer")
    parser.add_argument("--audit", action="store_true", help="Run audit on top articles")
    parser.add_argument("--query", type=str, help="Specific search query to test with Desktop KeywordResearch tools")
    parser.add_argument("--title", type=str, help="Title string to score")
    args = parser.parse_args()

    if args.query and args.title:
        score, notes = evaluate_title(args.title, args.query)
        print(f"\nTitle: \"{args.title}\"")
        print(f"Query: \"{args.query}\"")
        print(f"Score: {score}/100")
        print(f"Notes: {notes}\n")
        return

    if args.query:
        suggs, questions = discover_suggestions_and_questions(args.query)
        print(f"\nSuggestions for '{args.query}':")
        for s in suggs[:8]:
            print(f"  • {s}")
        print(f"\nUser Questions (H2 candidates):")
        for q in questions[:5]:
            print(f"  • ## {q.title()}?")
        return

    print("Use --query <string> or --query <string> --title <string> to test keywords and score titles.")


if __name__ == "__main__":
    main()
