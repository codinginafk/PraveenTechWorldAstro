#!/usr/bin/env python3
"""
scripts/optimize_article_batch.py
Automated keyword research, title scoring, and article upgrade engine
for PraveenTechWorld decaying articles older than 30 days.
"""

import os
import sys
import re
import json
import sqlite3

# Set utf-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = r"C:\Users\bunny\Downloads\00Resume\Building_Tech_Website"
ARTICLES_DIR = os.path.join(ROOT_DIR, "src", "content", "articles")
KW_TOOL_PATH = r"C:\Users\bunny\OneDrive\Desktop\KeywordResearch"

sys.path.insert(0, KW_TOOL_PATH)
import app as kw_app

TODAY = "2026-10-12"

def get_db_stats(query):
    """Pulls GSC impressions, clicks, position, and difficulty from data.db if available."""
    db_path = os.path.join(KW_TOOL_PATH, "data.db")
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    row = cur.execute(
        "SELECT clicks, impressions, position FROM gsc_queries WHERE query = ? LIMIT 1",
        (query.lower(),)
    ).fetchone()
    
    stat_row = cur.execute(
        "SELECT difficulty, score FROM kw_stats WHERE keyword = ? LIMIT 1",
        (query.lower(),)
    ).fetchone()
    
    con.close()
    return {
        "gsc_clicks": row[0] if row else 0,
        "gsc_impr": row[1] if row else 0,
        "gsc_pos": row[2] if row else None,
        "difficulty": stat_row[0] if stat_row else "medium",
        "score": stat_row[1] if stat_row else 50
    }

def get_autocomplete_questions(seed):
    """Pulls real autocomplete user questions from find_flow."""
    try:
        flow = kw_app.find_flow({"seed": seed, "sources": ["google", "duckduckgo"]})
        kws = flow.get("keywords", [])
        questions = [
            k.get("text") for k in kws
            if k.get("question") or re.search(r"^(how|why|what|can|does|is|fix)\b", k.get("text", "").lower())
        ]
        return questions[:5]
    except Exception as e:
        return []

def score_title(title, query):
    """Scores candidate title using Desktop KeywordResearch engine."""
    return kw_app.score_title(title, query, platform="google")

print("Optimization engine initialized successfully.")
