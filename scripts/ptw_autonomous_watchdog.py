#!/usr/bin/env python3
"""
PTW Autonomous Cadence Watchdog
Ensures the 2-hour autonomous cycle runs reliably even if system sleep or session restarts occurred.
"""

import os
import sys
import time
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
MEMORY_FILE = ROOT_DIR / "docs" / "project-memory" / "current.json"
LOG_FILE = ROOT_DIR / "runtime" / "watchdog.log"

INTERVAL_SECONDS = 2 * 60 * 60  # 2 hours

def log(msg):
    timestamp = datetime.now().astimezone().isoformat()
    line = f"[{timestamp}] {msg}"
    print(line, flush=True)
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

def get_last_run_time():
    if not MEMORY_FILE.exists():
        return None
    try:
        with open(MEMORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            updated_at = data.get("updatedAt")
            if updated_at:
                return datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
    except Exception as e:
        log(f"Error reading project memory: {e}")
    return None

def check_status():
    last_run = get_last_run_time()
    now = datetime.now(timezone.utc)
    if not last_run:
        log("No prior run time recorded in project memory. Ready for cycle.")
        return True, 0

    elapsed = (now - last_run).total_seconds()
    hours_elapsed = elapsed / 3600.0

    if elapsed >= INTERVAL_SECONDS:
        log(f"[ALERT] {hours_elapsed:.2f}h elapsed since last cycle ({last_run.isoformat()}). Cadence threshold reached! Next cycle ready.")
        return True, elapsed
    else:
        remaining = INTERVAL_SECONDS - elapsed
        log(f"[HEARTBEAT] {hours_elapsed:.2f}h elapsed. Next cycle in {remaining/60.0:.1f} minutes.")
        return False, elapsed

if __name__ == "__main__":
    if "--loop" in sys.argv:
        log("Starting PTW Continuous Cadence Watchdog Daemon (2-hour check)...")
        while True:
            ready, elapsed = check_status()
            time.sleep(60)
    else:
        ready, elapsed = check_status()
        print(f"Watchdog Status: Ready={ready}, Elapsed={elapsed/3600.0:.2f}h")
