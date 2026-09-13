#!/usr/bin/env python3
"""
PraveenTechWorld Cloudflare Automated Manager
Automates WAF rules, bot bypass for AdSense & AI crawlers, SSL verification, and cache purging.
"""

import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path

# Load from .env if present
env_path = Path(".env")
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip("'\"")
            if k not in os.environ:
                os.environ[k] = v

CF_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "")
CF_ZONE_ID = os.environ.get("CLOUDFLARE_ZONE_ID", "f1220fbe59077d2202a157d34caa1574")

if not CF_TOKEN:
    print("ERROR: CLOUDFLARE_API_TOKEN is not set in environment or .env", file=sys.stderr)
    print("Usage: python scripts/cloudflare_manager.py [audit|deploy-waf|verify-ssl|purge-cache]", file=sys.stderr)
    sys.exit(1)

BASE_URL = "https://api.cloudflare.com/client/v4"

def cf_request(endpoint, method="GET", data=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {
        "Authorization": f"Bearer {CF_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        try:
            return json.loads(err_body)
        except Exception:
            return {"success": False, "errors": [{"message": f"HTTP {e.code}: {e.reason}"}]}
    except Exception as e:
        return {"success": False, "errors": [{"message": str(e)}]}

def verify_token():
    print("[*] Step 1: Verifying API Token...")
    res = cf_request("/user/tokens/verify")
    if res.get("success"):
        print(f"  [+] Token verified! Status: {res.get('result', {}).get('status')}")
        return True
    else:
        print(f"  [-] Token verification failed: {res.get('errors')}")
        return False

def get_zone():
    print(f"[*] Step 2: Querying Zone ({CF_ZONE_ID})...")
    res = cf_request(f"/zones/{CF_ZONE_ID}")
    if res.get("success"):
        zone = res.get("result", {})
        print(f"  [+] Zone: {zone.get('name')} (Status: {zone.get('status')})")
        print(f"  Nameservers: {', '.join(zone.get('name_servers', []))}")
        return zone
    else:
        print(f"  [-] Failed to get zone: {res.get('errors')}")
        return None

def verify_and_harden_ssl():
    print("[*] Step 3: Checking SSL/TLS Settings...")
    res = cf_request(f"/zones/{CF_ZONE_ID}/settings/ssl")
    if res.get("success"):
        current_ssl = res.get("result", {}).get("value")
        print(f"  Current SSL mode: {current_ssl}")
        if current_ssl != "strict":
            print("  Upgrading SSL mode to 'strict'...")
            up = cf_request(f"/zones/{CF_ZONE_ID}/settings/ssl", method="PATCH", data={"value": "strict"})
            if up.get("success"):
                print("  [+] SSL mode set to Full (strict)")
            else:
                print(f"  [!] Could not update SSL mode: {up.get('errors')}")
        else:
            print("  [+] SSL mode is already Full (strict)")

    # Check Always Use HTTPS
    res = cf_request(f"/zones/{CF_ZONE_ID}/settings/always_use_https")
    if res.get("success"):
        val = res.get("result", {}).get("value")
        print(f"  Always Use HTTPS: {val}")
        if val != "on":
            cf_request(f"/zones/{CF_ZONE_ID}/settings/always_use_https", method="PATCH", data={"value": "on"})
            print("  [+] Enabled Always Use HTTPS")

    # Check Min TLS Version
    res = cf_request(f"/zones/{CF_ZONE_ID}/settings/min_tls_version")
    if res.get("success"):
        val = res.get("result", {}).get("value")
        print(f"  Minimum TLS Version: {val}")
        if val != "1.2":
            cf_request(f"/zones/{CF_ZONE_ID}/settings/min_tls_version", method="PATCH", data={"value": "1.2"})
            print("  [+] Enforced Minimum TLS Version 1.2")

def deploy_waf_bot_bypass_rule():
    print("[*] Step 4: Configuring WAF Custom Rules (Allow Search, AdSense & AI Crawlers)...")
    
    # Check custom rulesets
    ruleset_res = cf_request(f"/zones/{CF_ZONE_ID}/rulesets/phases/http_request_firewall_custom/entrypoint")
    
    rule_description = "Allow Verified Bots, Google AdSense & AI Search Crawlers"
    rule_expression = '(cf.client.bot) or (http.user_agent contains "Google-adstxt") or (http.user_agent contains "Mediapartners-Google") or (http.user_agent contains "Google-AdSense-Bot") or (http.user_agent contains "GPTBot") or (http.user_agent contains "ClaudeBot") or (http.user_agent contains "PerplexityBot")'
    
    rule_payload = {
        "action": "skip",
        "action_parameters": {
            "phases": [
                "http_request_firewall_managed"
            ],
            "ruleset": "current"
        },
        "description": rule_description,
        "enabled": True,
        "expression": rule_expression
    }

    if ruleset_res.get("success"):
        ruleset = ruleset_res.get("result", {})
        ruleset_id = ruleset.get("id")
        existing_rules = ruleset.get("rules", [])
        
        exists = False
        for r in existing_rules:
            if r.get("description") == rule_description:
                exists = True
                print(f"  [+] WAF rule '{rule_description}' already active (Rule ID: {r.get('id')})")
                break
        
        if not exists:
            print("  Deploying new WAF skip rule into existing ruleset...")
            add_res = cf_request(f"/zones/{CF_ZONE_ID}/rulesets/{ruleset_id}/rules", method="POST", data=rule_payload)
            if add_res.get("success"):
                print("  [+] Successfully deployed WAF bypass rule!")
            else:
                print(f"  [!] Could not add rule to ruleset: {add_res.get('errors')}")
    else:
        print("  Creating custom firewall ruleset...")
        create_res = cf_request(f"/zones/{CF_ZONE_ID}/rulesets", method="POST", data={
            "name": "default",
            "kind": "zone",
            "phase": "http_request_firewall_custom",
            "rules": [rule_payload]
        })
        if create_res.get("success"):
            print("  [+] Created ruleset and deployed WAF bypass rule!")
        else:
            print(f"  [!] Ruleset creation notice: {create_res.get('errors')}")

def purge_cache(urls=None):
    if urls:
        print(f"[*] Purging Cloudflare cache for {len(urls)} URLs...")
        res = cf_request(f"/zones/{CF_ZONE_ID}/purge_cache", method="POST", data={"files": urls})
    else:
        print("[*] Purging entire Cloudflare zone cache...")
        res = cf_request(f"/zones/{CF_ZONE_ID}/purge_cache", method="POST", data={"purge_everything": True})
    
    if res.get("success"):
        print("  [+] Cloudflare cache purged successfully!")
    else:
        print(f"  [!] Purge error: {res.get('errors')}")

def run_full_automation():
    print("=== Starting Cloudflare Full Automation ===")
    if not verify_token():
        return
    zone = get_zone()
    if not zone:
        return
    verify_and_harden_ssl()
    deploy_waf_bot_bypass_rule()
    print("\n[+] Cloudflare Automation Completed Successfully!")

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "full"
    if action == "full":
        run_full_automation()
    elif action == "verify":
        verify_token()
        get_zone()
    elif action == "waf":
        deploy_waf_bot_bypass_rule()
    elif action == "ssl":
        verify_and_harden_ssl()
    elif action == "purge":
        purge_cache()
    else:
        print(f"Unknown action: {action}")
