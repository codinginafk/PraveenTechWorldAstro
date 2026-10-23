#!/usr/bin/env python3
"""
PTW Google Search Console (GSC) Click & CTR Watchdog Daemon
Monitors organic performance, detects CTR decay, flags click drops,
and surfaces striking-distance opportunities to maximize search clicks.
"""

import os
import sys
import json
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from google.oauth2 import service_account
from googleapiclient.discovery import build

ROOT_DIR = Path(__file__).resolve().parent.parent
KEY_FILE = ROOT_DIR / "gcp-service-account.json"
REPORT_JSON = ROOT_DIR / "docs" / "antigravity" / "gsc_live_alerts.json"
REPORT_MD = ROOT_DIR / "docs" / "antigravity" / "gsc_live_alerts.md"
LOG_FILE = ROOT_DIR / "runtime" / "gsc_watchdog.log"

SITE_URL = "sc-domain:praveentechworld.com"
DOMAIN = "https://www.praveentechworld.com"
CHECK_INTERVAL_SECONDS = 3 * 3600  # 3 hours between polling cycles in daemon mode
LAG_DAYS = 3  # Google Search Console finalized data lag (standard is 3 days)
WINDOW_DAYS = 7  # Compare current 7 days vs previous 7 days

def log(msg):
    ts = datetime.now().astimezone().isoformat()
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

def get_service():
    if not KEY_FILE.exists():
        raise FileNotFoundError(f"Missing GCP Service Account Key at {KEY_FILE}")
    creds = service_account.Credentials.from_service_account_file(
        str(KEY_FILE),
        scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
    )
    return build("searchconsole", "v1", credentials=creds)

def query_gsc(service, start_date, end_date, dimensions=None, row_limit=25000):
    body = {
        "startDate": start_date.strftime("%Y-%m-%d"),
        "endDate": end_date.strftime("%Y-%m-%d"),
        "rowLimit": row_limit,
        "dataState": "final",
        "type": "web"
    }
    if dimensions:
        body["dimensions"] = dimensions
    try:
        response = service.searchanalytics().query(siteUrl=SITE_URL, body=body).execute()
        return response.get("rows", [])
    except Exception as e:
        log(f"Error querying GSC API ({start_date} to {end_date}, dim={dimensions}): {e}")
        return []

def clean_page_path(url):
    return url.replace(DOMAIN, "").rstrip("/") or "/"

def run_watchdog_audit():
    log("Running GSC CTR & Click Loss Watchdog audit...")
    service = get_service()

    today = datetime.now(timezone.utc).date()
    final_end = today - timedelta(days=LAG_DAYS)
    curr_start = final_end - timedelta(days=WINDOW_DAYS - 1)
    prev_end = curr_start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=WINDOW_DAYS - 1)

    log(f"Window Comparison: Previous [{prev_start} to {prev_end}] vs Current [{curr_start} to {final_end}]")

    # Fetch totals
    prev_totals_raw = query_gsc(service, prev_start, prev_end, dimensions=[])
    curr_totals_raw = query_gsc(service, curr_start, final_end, dimensions=[])

    def parse_totals(rows):
        clicks = sum(r.get("clicks", 0) for r in rows)
        impressions = sum(r.get("impressions", 0) for r in rows)
        ctr = (clicks / impressions * 100) if impressions > 0 else 0.0
        pos = (sum(r.get("position", 0) * r.get("impressions", 0) for r in rows) / impressions) if impressions > 0 else 0.0
        return {"clicks": round(clicks, 1), "impressions": round(impressions, 1), "ctr": round(ctr, 2), "position": round(pos, 1)}

    prev_totals = parse_totals(prev_totals_raw)
    curr_totals = parse_totals(curr_totals_raw)

    log(f"Previous 7d: Clicks={prev_totals['clicks']}, Imp={prev_totals['impressions']}, CTR={prev_totals['ctr']}%, Pos={prev_totals['position']}")
    log(f"Current 7d:  Clicks={curr_totals['clicks']}, Imp={curr_totals['impressions']}, CTR={curr_totals['ctr']}%, Pos={curr_totals['position']}")

    # Fetch query + page rows
    prev_rows = query_gsc(service, prev_start, prev_end, dimensions=["query", "page"])
    curr_rows = query_gsc(service, curr_start, final_end, dimensions=["query", "page"])

    prev_map = {}
    for r in prev_rows:
        q = r.get("keys", ["", ""])[0]
        p = clean_page_path(r.get("keys", ["", ""])[1])
        prev_map[(q, p)] = {
            "clicks": r.get("clicks", 0),
            "impressions": r.get("impressions", 0),
            "ctr": round(r.get("ctr", 0) * 100, 2),
            "position": round(r.get("position", 0), 1),
        }

    compared = []
    cannibalization_map = {}

    for r in curr_rows:
        keys = r.get("keys", ["", ""])
        query = keys[0]
        page = clean_page_path(keys[1])
        clicks = r.get("clicks", 0)
        impressions = r.get("impressions", 0)
        ctr = round(r.get("ctr", 0) * 100, 2)
        pos = round(r.get("position", 0), 1)

        prev = prev_map.get((query, page), {})
        old_clicks = prev.get("clicks", 0)
        old_imp = prev.get("impressions", 0)
        old_ctr = prev.get("ctr", 0.0)
        old_pos = prev.get("position", None)

        click_change = clicks - old_clicks
        imp_change = impressions - old_imp
        ctr_change = round(ctr - old_ctr, 2)
        pos_change = round(old_pos - pos, 1) if old_pos is not None else None
        is_new = (query, page) not in prev_map

        item = {
            "query": query,
            "page": page,
            "clicks": clicks,
            "impressions": impressions,
            "ctr": ctr,
            "position": pos,
            "clickChange": click_change,
            "impressionChange": imp_change,
            "ctrChange": ctr_change,
            "positionChange": pos_change,
            "isNew": is_new,
            "priorityScore": round(impressions / max(pos, 1.0), 2),
        }
        compared.append(item)

        # Track cannibalization candidates
        if impressions >= 5:
            cannibalization_map.setdefault(query, []).append({
                "page": page,
                "clicks": clicks,
                "impressions": impressions,
                "position": pos
            })

    # Filter categories
    # 1. Click Drops: Lost clicks compared to prior window
    click_drops = [
        item for item in compared
        if item["clickChange"] < 0 or (item["clicks"] == 0 and item["impressions"] >= 10 and item["clickChange"] <= -1)
    ]
    click_drops.sort(key=lambda x: x["clickChange"])

    # 2. Low CTR on High-Impression queries (Pos <= 15, Imp >= 15, CTR < 2.0%)
    low_ctr_anomalies = [
        item for item in compared
        if item["impressions"] >= 15 and item["position"] <= 15.0 and item["ctr"] < 2.0
    ]
    low_ctr_anomalies.sort(key=lambda x: x["impressions"], reverse=True)

    # 3. Striking Distance Opportunities (Pos 4.0 - 20.0, Imp >= 10)
    striking_distance = [
        item for item in compared
        if 4.0 <= item["position"] <= 20.0 and item["impressions"] >= 10
    ]
    striking_distance.sort(key=lambda x: x["priorityScore"], reverse=True)

    # 4. Emerging New Queries (New in window, Imp >= 5)
    emerging = [
        item for item in compared
        if item["isNew"] and item["impressions"] >= 5
    ]
    emerging.sort(key=lambda x: x["impressions"], reverse=True)

    # 5. Cannibalization instances (2+ pages ranking for same query with >= 5 imp each)
    cannibalized = []
    for q, pages in cannibalization_map.items():
        if len(pages) > 1:
            cannibalized.append({"query": q, "pages": pages})

    audit_payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "siteUrl": SITE_URL,
        "previousWindow": {"startDate": str(prev_start), "endDate": str(prev_end), **prev_totals},
        "currentWindow": {"startDate": str(curr_start), "endDate": str(final_end), **curr_totals},
        "delta": {
            "clickChange": round(curr_totals["clicks"] - prev_totals["clicks"], 1),
            "impressionChange": round(curr_totals["impressions"] - prev_totals["impressions"], 1),
            "ctrChange": round(curr_totals["ctr"] - prev_totals["ctr"], 2),
        },
        "summaryCounts": {
            "clickDrops": len(click_drops),
            "lowCtrAnomalies": len(low_ctr_anomalies),
            "strikingDistanceOpportunities": len(striking_distance),
            "emergingQueries": len(emerging),
            "cannibalizedQueries": len(cannibalized),
        },
        "topClickDrops": click_drops[:15],
        "topLowCtrAnomalies": low_ctr_anomalies[:15],
        "topStrikingDistance": striking_distance[:20],
        "topEmerging": emerging[:15],
        "cannibalized": cannibalized[:10],
    }

    # Save JSON report
    REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_JSON, "w", encoding="utf-8") as f:
        json.dump(audit_payload, f, indent=2)
    log(f"Saved GSC alerts report to {REPORT_JSON}")

    # Generate Markdown Alert Summary
    md_content = f"""# 🚨 Google Search Console CTR & Click Watchdog Report

**Generated At:** `{audit_payload['timestamp']}`  
**Comparing:** Current 7-Day Window (`{curr_start}` -> `{final_end}`) vs Previous 7-Day Window (`{prev_start}` -> `{prev_end}`)

---

## 📊 High-Level Performance Delta

| Metric | Previous 7 Days | Current 7 Days | Change | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Total Clicks** | **{prev_totals['clicks']}** | **{curr_totals['clicks']}** | **{audit_payload['delta']['clickChange']:+0.1f}** | {'🟢 Growing' if audit_payload['delta']['clickChange'] >= 0 else '🔴 Declining'} |
| **Impressions** | **{prev_totals['impressions']:,}** | **{curr_totals['impressions']:,}** | **{audit_payload['delta']['impressionChange']:+0.1f}** | {'🟢 Growing' if audit_payload['delta']['impressionChange'] >= 0 else '🔴 Declining'} |
| **Average CTR** | **{prev_totals['ctr']}%** | **{curr_totals['ctr']}%** | **{audit_payload['delta']['ctrChange']:+0.2f}%** | {'🟢 Healthy' if audit_payload['delta']['ctrChange'] >= 0 else '🟡 Low CTR Watch'} |
| **Avg Position** | **{prev_totals['position']}** | **{curr_totals['position']}** | **{round(prev_totals['position'] - curr_totals['position'], 1):+0.1f}** | {'🟢 Improving' if curr_totals['position'] <= prev_totals['position'] else '🟡 Slipping'} |

---

## ⚡ Top Striking-Distance Click Opportunities (Position 4–20)
*These queries already have strong search visibility. Optimizing titles and meta tags to match exact intent will directly convert impressions into clicks!*

| Query | Page | Pos | Imp | Clicks | CTR | Priority |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
"""
    for item in striking_distance[:15]:
        md_content += f"| `{item['query']}` | [{item['page']}]({DOMAIN}{item['page']}) | {item['position']} | {item['impressions']} | {item['clicks']} | {item['ctr']}% | **{item['priorityScore']}** |\n"

    md_content += """
---

## ⚠️ Low CTR Anomalies (High Impressions, Zero/Low Clicks)
*Users are seeing these results on Page 1 or 2, but choosing competitors over us. Urgent Title/Description rewrite needed!*

| Query | Page | Pos | Imp | Clicks | CTR | Action Required |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
"""
    for item in low_ctr_anomalies[:12]:
        md_content += f"| `{item['query']}` | [{item['page']}]({DOMAIN}{item['page']}) | {item['position']} | {item['impressions']} | {item['clicks']} | {item['ctr']}% | Make title match exact query string verbatim |\n"

    md_content += """
---

## 📉 Click Drop Alerts
*Queries that yielded fewer clicks than the previous 7-day period.*

| Query | Page | Current Clicks | Prior Clicks | Drop | Current Pos |
| :--- | :--- | :---: | :---: | :---: | :---: |
"""
    if click_drops:
        for item in click_drops[:10]:
            prior = item['clicks'] - item['clickChange']
            md_content += f"| `{item['query']}` | [{item['page']}]({DOMAIN}{item['page']}) | {item['clicks']} | {prior} | **{item['clickChange']}** | {item['position']} |\n"
    else:
        md_content += "| *None detected in current window* | - | - | - | - | - |\n"

    md_content += """
---

## 🌟 Emerging Queries (New Search Footprints)
*Recently indexed keywords generating first impressions.*

| Emerging Query | Page | Impressions | Current Position |
| :--- | :--- | :---: | :---: |
"""
    for item in emerging[:10]:
        md_content += f"| `{item['query']}` | [{item['page']}]({DOMAIN}{item['page']}) | {item['impressions']} | {item['position']} |\n"

    with open(REPORT_MD, "w", encoding="utf-8") as f:
        f.write(md_content)
    log(f"Saved GSC markdown alerts report to {REPORT_MD}")

    log("Watchdog audit completed successfully.")
    return audit_payload

if __name__ == "__main__":
    if "--loop" in sys.argv or "--daemon" in sys.argv:
        log("Starting PTW Google Search Console CTR & Click Watchdog Daemon (3-hour loop)...")
        while True:
            try:
                run_watchdog_audit()
            except Exception as e:
                log(f"[ERROR] Watchdog cycle failed: {e}")
            time.sleep(CHECK_INTERVAL_SECONDS)
    else:
        res = run_watchdog_audit()
        print("\n=== PTW GSC CTR Watchdog Summary ===")
        print(f"Total Clicks: {res['currentWindow']['clicks']} (Change: {res['delta']['clickChange']:+0.1f})")
        print(f"Total Impressions: {res['currentWindow']['impressions']} (Change: {res['delta']['impressionChange']:+0.1f})")
        print(f"Average CTR: {res['currentWindow']['ctr']}% (Change: {res['delta']['ctrChange']:+0.2f}%)")
        print(f"Striking Distance Opportunities: {res['summaryCounts']['strikingDistanceOpportunities']}")
        print(f"Low CTR Anomalies Flagged: {res['summaryCounts']['lowCtrAnomalies']}")
        print(f"Click Drop Alerts: {res['summaryCounts']['clickDrops']}")
