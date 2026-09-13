#!/usr/bin/env python3
"""
PTW Google Search Console (GSC) Fresh Click Impact & Anomaly Watcher
Tracks real-time and fresh dataState="all" search analytics, detects day-over-day
click drops, position decays, and monitors recently updated articles for ranking impact.
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
OUTPUT_JSON = ROOT_DIR / "docs" / "antigravity" / "gsc_fresh_impact_alerts.json"
OUTPUT_MD = ROOT_DIR / "docs" / "antigravity" / "gsc_fresh_impact_alerts.md"
LOG_FILE = ROOT_DIR / "runtime" / "gsc_impact_watcher.log"

SITE_URL = "sc-domain:praveentechworld.com"
DOMAIN = "https://www.praveentechworld.com"
POLL_INTERVAL_SECONDS = 2 * 3600  # 2 hours

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

def clean_page(url):
    return url.replace(DOMAIN, "").rstrip("/") or "/"

def query_gsc(service, start_date, end_date, dimensions=None, row_limit=25000, data_state="all"):
    body = {
        "startDate": start_date if isinstance(start_date, str) else start_date.strftime("%Y-%m-%d"),
        "endDate": end_date if isinstance(end_date, str) else end_date.strftime("%Y-%m-%d"),
        "rowLimit": row_limit,
        "dataState": data_state,
        "type": "web"
    }
    if dimensions:
        body["dimensions"] = dimensions
    try:
        response = service.searchanalytics().query(siteUrl=SITE_URL, body=body).execute()
        return response.get("rows", [])
    except Exception as e:
        log(f"GSC query failed ({start_date} to {end_date}, dim={dimensions}): {e}")
        return []

def get_recent_monitored_slugs():
    """Detect recently modified articles from git history or project memory."""
    slugs = set()
    pm_file = ROOT_DIR / "docs" / "project-memory" / "current.json"
    if pm_file.exists():
        try:
            with open(pm_file, "r", encoding="utf-8") as f:
                pm = json.load(f)
                files = pm.get("lastHandoff", {}).get("files", [])
                for fpath in files:
                    if fpath.startswith("src/content/articles/") and fpath.endswith(".mdx"):
                        slug = Path(fpath).stem
                        slugs.add(f"/blog/{slug}")
        except Exception:
            pass

    known_cycle_slugs = [
        "/blog/how-to-fix-ollama-cuda-out-of-memory-oom-errors-nvidia-rtx-gpus",
        "/blog/windows-11-bluetooth-disappeared-not-working-fixes",
        "/blog/fix-dism-0x800f0915-efi-system-partition-too-small",
        "/blog/wsl2-internet-not-working-windows-11-dns-vpn-fixes",
        "/blog/windows-11-volume-control-not-working-8-proven-fixes-for-2026",
        "/blog/how-to-fix-windows-11-kb5121003-inpoutx64-crash",
        "/blog/does-resetting-windows-remove-viruses-completely",
        "/blog/how-to-fix-audiodg-exe-high-cpu-windows-11"
    ]
    for s in known_cycle_slugs:
        slugs.add(s)

    return sorted(list(slugs))

def run_impact_audit():
    log("Starting GSC Fresh Click Impact & Anomaly Audit...")
    service = get_service()

    today = datetime.now(timezone.utc).date()
    start_14d = today - timedelta(days=14)
    end_date = today

    # 1. Fetch daily time series (dataState="all")
    daily_rows = query_gsc(service, start_14d, end_date, dimensions=["date"])
    daily_stats = []
    for r in daily_rows:
        d = r.get("keys", [""])[0]
        clicks = r.get("clicks", 0)
        imp = r.get("impressions", 0)
        ctr = round(r.get("ctr", 0) * 100, 2)
        pos = round(r.get("position", 0), 1)
        daily_stats.append({
            "date": d,
            "clicks": clicks,
            "impressions": imp,
            "ctr": ctr,
            "position": pos
        })
    daily_stats.sort(key=lambda x: x["date"])

    # 2. Day-over-Day Comparison
    dod_summary = {}
    if len(daily_stats) >= 2:
        latest = daily_stats[-1]
        prior = daily_stats[-2]
        dod_summary = {
            "latestDate": latest["date"],
            "priorDate": prior["date"],
            "latestClicks": latest["clicks"],
            "priorClicks": prior["clicks"],
            "clickDiff": latest["clicks"] - prior["clicks"],
            "latestImp": latest["impressions"],
            "priorImp": prior["impressions"],
            "impDiff": latest["impressions"] - prior["impressions"],
            "latestCTR": latest["ctr"],
            "priorCTR": prior["ctr"],
            "ctrDiff": round(latest["ctr"] - prior["ctr"], 2),
            "latestPos": latest["position"],
            "priorPos": prior["position"],
            "posDiff": round(prior["position"] - latest["position"], 1)
        }

    # 3. Query 3-day window vs prior 3-day window
    d3_end = today
    d3_start = today - timedelta(days=2)
    prev_d3_end = d3_start - timedelta(days=1)
    prev_d3_start = prev_d3_end - timedelta(days=2)

    latest_pages = query_gsc(service, d3_start, d3_end, dimensions=["page"])
    prev_pages = query_gsc(service, prev_d3_start, prev_d3_end, dimensions=["page"])

    prev_p_map = {}
    for r in prev_pages:
        p = clean_page(r.get("keys", [""])[0])
        prev_p_map[p] = {
            "clicks": r.get("clicks", 0),
            "impressions": r.get("impressions", 0),
            "ctr": round(r.get("ctr", 0) * 100, 2),
            "position": round(r.get("position", 0), 1)
        }

    page_changes = []
    for r in latest_pages:
        p = clean_page(r.get("keys", [""])[0])
        clicks = r.get("clicks", 0)
        imp = r.get("impressions", 0)
        ctr = round(r.get("ctr", 0) * 100, 2)
        pos = round(r.get("position", 0), 1)

        prev = prev_p_map.get(p, {"clicks": 0, "impressions": 0, "ctr": 0.0, "position": None})
        click_diff = clicks - prev["clicks"]
        imp_diff = imp - prev["impressions"]
        pos_diff = round(prev["position"] - pos, 1) if prev["position"] is not None else None

        page_changes.append({
            "page": p,
            "clicks": clicks,
            "prevClicks": prev["clicks"],
            "clickDiff": click_diff,
            "impressions": imp,
            "prevImp": prev["impressions"],
            "impDiff": imp_diff,
            "ctr": ctr,
            "position": pos,
            "posDiff": pos_diff
        })

    # Find click drop alerts (pages losing >= 1 click)
    click_drops = [p for p in page_changes if p["clickDiff"] < 0]
    click_drops.sort(key=lambda x: x["clickDiff"])

    # Find click gainers (pages gaining >= 1 click)
    click_gainers = [p for p in page_changes if p["clickDiff"] > 0]
    click_gainers.sort(key=lambda x: x["clickDiff"], reverse=True)

    # 4. Monitored Recent Articles Health
    monitored_slugs = get_recent_monitored_slugs()
    monitored_results = []
    all_pages_map = {p["page"]: p for p in page_changes}

    for slug in monitored_slugs:
        if slug in all_pages_map:
            p_data = all_pages_map[slug]
            status = "🟢 Active & Gaining" if p_data["clickDiff"] > 0 else ("🟡 Stable" if p_data["clickDiff"] == 0 else "🔴 Click Drop")
            monitored_results.append({
                "slug": slug,
                "status": status,
                **p_data
            })
        else:
            full_url = f"{DOMAIN}{slug}"
            direct_rows = query_gsc(service, d3_start, d3_end, dimensions=["page"])
            found = False
            for dr in direct_rows:
                if clean_page(dr.get("keys", [""])[0]) == slug:
                    monitored_results.append({
                        "slug": slug,
                        "status": "🟢 Active Fresh",
                        "page": slug,
                        "clicks": dr.get("clicks", 0),
                        "prevClicks": 0,
                        "clickDiff": dr.get("clicks", 0),
                        "impressions": dr.get("impressions", 0),
                        "prevImp": 0,
                        "impDiff": dr.get("impressions", 0),
                        "ctr": round(dr.get("ctr", 0) * 100, 2),
                        "position": round(dr.get("position", 0), 1),
                        "posDiff": 0
                    })
                    found = True
                    break
            if not found:
                monitored_results.append({
                    "slug": slug,
                    "status": "⏳ Indexing / Fresh Lag",
                    "page": slug,
                    "clicks": 0,
                    "prevClicks": 0,
                    "clickDiff": 0,
                    "impressions": 0,
                    "prevImp": 0,
                    "impDiff": 0,
                    "ctr": 0.0,
                    "position": 0.0,
                    "posDiff": 0
                })

    # Assemble JSON payload
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "siteUrl": SITE_URL,
        "dailyTrends": daily_stats,
        "dayOverDay": dod_summary,
        "threeDayWindow": {
            "current": f"{d3_start} to {d3_end}",
            "previous": f"{prev_d3_start} to {prev_d3_end}",
            "totalPageRecords": len(page_changes),
            "clickDropsCount": len(click_drops),
            "clickGainersCount": len(click_gainers)
        },
        "monitoredArticles": monitored_results,
        "topClickDrops": click_drops[:10],
        "topClickGainers": click_gainers[:10]
    }

    # Write JSON
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    log(f"Saved fresh impact report to {OUTPUT_JSON}")

    # Write Markdown
    md_lines = [
        "# 📈 Real-Time & Fresh GSC Click Impact Watchdog",
        "",
        f"**Audit Timestamp:** `{payload['timestamp']}`  ",
        f"**Data State:** `all` (Real-Time Fresh + Finalized)  ",
        f"**Monitored Window:** 3-Day Rolling Window (`{d3_start}` to `{d3_end}` vs `{prev_d3_start}` to `{prev_d3_end}`)",
        "",
        "---",
        "",
        "## ⚡ Day-over-Day Fresh Search Trajectory",
        ""
    ]

    if dod_summary:
        click_ico = "🟢" if dod_summary['clickDiff'] >= 0 else "🔴"
        imp_ico = "🟢" if dod_summary['impDiff'] >= 0 else "🔴"
        pos_ico = "🟢" if dod_summary['posDiff'] >= 0 else "🟡"
        md_lines.extend([
            f"| Metric | {dod_summary['priorDate']} (Prior) | {dod_summary['latestDate']} (Latest) | Day Delta | Status |",
            "| :--- | :---: | :---: | :---: | :---: |",
            f"| **Daily Clicks** | **{dod_summary['priorClicks']}** | **{dod_summary['latestClicks']}** | **{dod_summary['clickDiff']:+d}** | {click_ico} |",
            f"| **Daily Impressions** | **{dod_summary['priorImp']:,}** | **{dod_summary['latestImp']:,}** | **{dod_summary['impDiff']:+d}** | {imp_ico} |",
            f"| **Daily CTR** | **{dod_summary['priorCTR']}%** | **{dod_summary['latestCTR']}%** | **{dod_summary['ctrDiff']:+0.2f}%** | {'🟢' if dod_summary['ctrDiff'] >= 0 else '🟡'} |",
            f"| **Avg Position** | **{dod_summary['priorPos']}** | **{dod_summary['latestPos']}** | **{dod_summary['posDiff']:+0.1f}** | {pos_ico} |",
            "",
            "---",
            ""
        ])

    md_lines.extend([
        "## 🎯 Recently Monitored / Optimized Articles",
        "*Live performance telemetry for articles updated during autonomous cycles:*",
        "",
        "| Article URL | 3d Clicks | 3d Imp | 3d CTR | Pos | Status |",
        "| :--- | :---: | :---: | :---: | :---: | :---: |"
    ])

    for m in monitored_results:
        md_lines.append(f"| [`{m['slug']}`]({DOMAIN}{m['slug']}) | **{m['clicks']}** ({m['clickDiff']:+d}) | {m['impressions']:,} | {m['ctr']}% | {m['position']} | {m['status']} |")

    md_lines.extend([
        "",
        "---",
        "",
        "## 🔴 Immediate Click Drop Alerts (Action Required)",
        "*Pages that saw negative click movement over the last 3-day rolling period:*",
        "",
        "| Page URL | Current Clicks | Prior Clicks | Drop | Current Imp | Avg Pos |",
        "| :--- | :---: | :---: | :---: | :---: | :---: |"
    ])

    if click_drops:
        for cd in click_drops[:10]:
            md_lines.append(f"| [`{cd['page']}`]({DOMAIN}{cd['page']}) | {cd['clicks']} | {cd['prevClicks']} | **{cd['clickDiff']}** | {cd['impressions']} | {cd['position']} |")
    else:
        md_lines.append("| *No major click drops detected in the rolling window.* | - | - | - | - | - |")

    md_lines.extend([
        "",
        "---",
        "",
        "## 🟢 Click Gainers (Recent Winners)",
        "*Pages currently accelerating search clicks:*",
        "",
        "| Page URL | Current Clicks | Prior Clicks | Gain | Current Imp | Avg Pos |",
        "| :--- | :---: | :---: | :---: | :---: | :---: |"
    ])

    for cg in click_gainers[:10]:
        md_lines.append(f"| [`{cg['page']}`]({DOMAIN}{cg['page']}) | {cg['clicks']} | {cg['prevClicks']} | **+{cg['clickDiff']}** | {cg['impressions']} | {cg['position']} |")

    md_lines.append("")

    with open(OUTPUT_MD, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
    log(f"Saved markdown impact report to {OUTPUT_MD}")
    log("Impact audit completed successfully.")

def main():
    loop_mode = "--loop" in sys.argv
    if loop_mode:
        log(f"Starting GSC Impact Watchdog daemon (interval: {POLL_INTERVAL_SECONDS}s)...")
        while True:
            try:
                run_impact_audit()
            except Exception as e:
                log(f"Unhandled error in impact audit loop: {e}")
            time.sleep(POLL_INTERVAL_SECONDS)
    else:
        run_impact_audit()

if __name__ == "__main__":
    main()
