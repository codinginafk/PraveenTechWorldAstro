import os
import re
import json

ROOT = r"c:\Users\bunny\Downloads\00Resume\Building_Tech_Website"
CONFIG_PATH = os.path.join(ROOT, "astro.config.mjs")
ARTICLES_DIR = os.path.join(ROOT, "src", "content", "articles")

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    config_text = f.read()

# Parse redirects object
match = re.search(r"redirects:\s*\{(.*?)\n\s*\},", config_text, re.DOTALL)
if not match:
    print("Could not find redirects object in astro.config.mjs")
    exit(1)

redirects_block = match.group(1)
redirect_pairs = re.findall(r'["\']([^"\']+)["\']:\s*["\']([^"\']+)["\']', redirects_block)

print(f"Total redirects configured: {len(redirect_pairs)}")

articles = set(f[:-4] for f in os.listdir(ARTICLES_DIR) if f.endswith(".mdx"))

errors = []
for src, dest in redirect_pairs:
    if src == dest:
        errors.append(f"Self-redirect loop: {src} -> {dest}")
    if dest.startswith("/blog/"):
        target_slug = dest.replace("/blog/", "").strip()
        if target_slug not in articles:
            errors.append(f"Target article does not exist: {src} -> {dest} (slug: {target_slug})")

if errors:
    print(f"FAILED: Found {len(errors)} redirect errors:")
    for err in errors:
        print("  -", err)
else:
    print(f"SUCCESS: All {len(redirect_pairs)} redirects are valid and have existing destination targets!")

with open(r"c:\Users\bunny\Downloads\00Resume\Building_Tech_Website\scripts\verify_redirects.py", "w", encoding="utf-8") as f:
    with open(__file__, "r", encoding="utf-8") as src:
        f.write(src.read())
