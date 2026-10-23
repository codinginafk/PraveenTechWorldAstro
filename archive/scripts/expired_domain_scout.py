#!/usr/bin/env python3
"""
PTW Expired Domain Due Diligence & Wayback Forensic Scout
Evaluates prospective tech domains for 1:1 authority acquisition,
checking Wayback Machine archives, anchor hygiene, and target hub mapping.

Usage:
  python scripts/expired_domain_scout.py --domain exampletech.com
"""

import sys
import json
import argparse
import requests
from urllib.parse import urlparse

# Hub mapping registry for PraveenTechWorld 1:1 301 authority transfer
HUB_TOPIC_MAPPING = {
    "windows": {
        "hub_url": "https://www.praveentechworld.com/blog/windows-11-kernel-hardware-driver-stability-master-runbook",
        "description": "Windows Kernel & Driver Stability Master Runbook",
        "keywords": ["windows", "bsod", "driver", "update", "patch", "registry", "pc", "hardware"]
    },
    "privacy": {
        "hub_url": "https://www.praveentechworld.com/blog/degoogle-starter-pack-complete-guide",
        "description": "DeGoogle Starter Pack & Privacy Telemetry Master Hub",
        "keywords": ["privacy", "degoogle", "security", "vpn", "tracking", "telemetry", "gdpr", "proton"]
    },
    "password_security": {
        "hub_url": "https://www.praveentechworld.com/blog/best-password-managers-in-2026-security-features-and-pricing-compared",
        "description": "Enterprise Password Manager & Zero-Knowledge Vault Guide",
        "keywords": ["password", "vault", "bitwarden", "1password", "credential", "auth", "sso", "scim"]
    },
    "devops_ai": {
        "hub_url": "https://www.praveentechworld.com/blog/how-we-replaced-docker-desktop-with-podman-windows-11-wsl2",
        "description": "DevOps, Containers & Local AI Architecture Hub",
        "keywords": ["docker", "podman", "wsl", "kubernetes", "linux", "sysadmin", "ollama", "deepseek"]
    }
}

def check_wayback_snapshots(domain):
    """Queries Internet Archive Wayback Machine API for domain historical presence."""
    api_url = f"https://archive.org/wayback/available?url={domain}"
    try:
        resp = requests.get(api_url, timeout=10)
        data = resp.json()
        snapshots = data.get("archived_snapshots", {})
        closest = snapshots.get("closest", {})
        if closest.get("available"):
            return {
                "available": True,
                "timestamp": closest.get("timestamp"),
                "url": closest.get("url"),
                "status": closest.get("status")
            }
    except Exception as e:
        return {"available": False, "error": str(e)}
    return {"available": False}

def evaluate_topical_alignment(domain, topic_hint=""):
    """Calculates best 1:1 destination hub on PraveenTechWorld."""
    best_category = None
    max_matches = 0
    clean_domain = domain.lower()
    
    for category, details in HUB_TOPIC_MAPPING.items():
        matches = sum(1 for kw in details["keywords"] if kw in clean_domain or kw in topic_hint.lower())
        if matches > max_matches:
            max_matches = matches
            best_category = category

    if not best_category:
        best_category = "privacy"  # Default to high-authority DeGoogle flagship

    return HUB_TOPIC_MAPPING[best_category]

def run_audit(domain, topic_hint=""):
    print(f"\n=======================================================")
    print(f" [SEARCH] PTW Expired Domain Forensic Due-Diligence: {domain}")
    print(f"=======================================================\n")

    # Step 1: Wayback History
    print("[1] Querying Wayback Machine Historical Archives...")
    wb = check_wayback_snapshots(domain)
    if wb.get("available"):
        ts = wb['timestamp']
        formatted_date = f"{ts[:4]}-{ts[4:6]}-{ts[6:8]}"
        print(f"    [+] Historical Snapshots Found! Closest Archive: {formatted_date}")
        print(f"    [+] Snapshot URL: {wb['url']}")
    else:
        print(f"    [!] No historical snapshot found via standard API check.")

    # Step 2: 1:1 Topic Mapping
    print("\n[2] Evaluating 1:1 Semantic Target Hub on PraveenTechWorld...")
    target_hub = evaluate_topical_alignment(domain, topic_hint)
    print(f"    [+] Recommended 301 Target Hub: {target_hub['description']}")
    print(f"    [+] Canonical Destination:    {target_hub['hub_url']}")

    # Step 3: 2026 Google Spam Update Compliance Checklist
    print("\n[3] 2026 Google 'Expired Domain Abuse' Risk Assessment:")
    print("    * Topical Continuity: Must remain strictly within IT/tech/software.")
    print("    * Anchor Profile: Reject if anchor text contains casino, adult, or crypto spam.")
    print("    * Clean Dropped Status: Ensure domain was not a secondary PBN doorway.")
    print("    * 301 Implementation: Map old relevant slugs 1:1; redirect root to matching hub.")
    
    print("\n[4] Recommended Next Step:")
    print(f"    1. Check backlink profile in Ahrefs Free Backlink Checker / Majestic for: {domain}")
    print(f"    2. Confirm referring domains (RD) > 25 from tech/educational sources.")
    print(f"    3. Point DNS A-record to Vercel/Cloudflare with 1:1 301 rule to {target_hub['hub_url']}\n")

def main():
    parser = argparse.ArgumentParser(description="PTW Expired Domain Due Diligence Scout")
    parser.add_argument("--domain", required=True, help="Domain name to audit (e.g. exampletech.org)")
    parser.add_argument("--topic", default="", help="Optional topic hint (e.g. windows, privacy, security)")
    args = parser.parse_args()

    run_audit(args.domain, args.topic)

if __name__ == "__main__":
    main()
