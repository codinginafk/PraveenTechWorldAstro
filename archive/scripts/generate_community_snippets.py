import os
import re

ROOT = r"c:\Users\bunny\Downloads\00Resume\Building_Tech_Website"
ARTICLES_DIR = os.path.join(ROOT, "src", "content", "articles")
OUTPUT_PATH = os.path.join(ROOT, "syndication", "reddit_community_snippets.md")

targets = [
    {
        "slug": "why-windows-11-24h2-bsods-on-wd-nvme-hmb-fix",
        "subreddits": "r/Windows11, r/buildapc",
        "title": "Windows 11 24H2 BSODs on WD NVMe SSDs (HMB 200MB bug)"
    },
    {
        "slug": "how-to-fix-nvlddmkm-sys-event-id-13-gpu-driver-crashes-windows-11",
        "subreddits": "r/nvidia, r/techsupport",
        "title": "NVIDIA nvlddmkm.sys Event ID 13 Driver Crash"
    },
    {
        "slug": "wsl2-internet-not-working-windows-11-dns-vpn-fixes",
        "subreddits": "r/bashonubuntuonwindows, r/docker",
        "title": "WSL2 Internet / DNS Dropped after Windows Update or VPN"
    },
    {
        "slug": "windows-11-volume-control-not-working-8-proven-fixes-for-2026",
        "subreddits": "r/Windows11, r/techsupport",
        "title": "Windows 11 Volume Slider Frozen / Dead"
    },
    {
        "slug": "how-to-run-deepseek-r1-locally-on-8gb-vram",
        "subreddits": "r/LocalLLaMA, r/ollama",
        "title": "Running DeepSeek-R1 Distill Models on 8GB VRAM (Ollama & llama.cpp)"
    }
]

snippets = []
snippets.append("# Community & Reddit Helpful Response Snippets (Value-First)\n")
snippets.append("> **Rules of Engagement:** Always answer the user's question directly in the first sentence. Include the full command or registry fix in markdown. Never post bare links; only add the source article as an in-depth reference at the end.\n\n---\n")

for t in targets:
    file_path = os.path.join(ARTICLES_DIR, f"{t['slug']}.mdx")
    if not os.path.exists(file_path):
        continue
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        raw = f.read()
    
    # Extract quick answer summary and command if present
    qa_match = re.search(r'quickAnswer:\s*\n\s*summary:\s*"(.*?)"\s*\n\s*command:\s*(.*?)\s*\n', raw, re.DOTALL)
    summary = qa_match.group(1) if qa_match else "Direct solution from workbench tests."
    cmd = qa_match.group(2).strip().strip('"').strip("'") if qa_match else ""

    snippets.append(f"## Target Subreddits: {t['subreddits']}")
    snippets.append(f"### Topic: {t['title']}\n")
    snippets.append("```markdown")
    snippets.append(f"Had this exact issue on our lab rigs. Here is the direct fix without rebooting or reinstalling:\n")
    snippets.append(f"**Root Cause:** {summary}\n")
    if cmd:
        snippets.append(f"Run this in an elevated PowerShell prompt:\n")
        snippets.append("```powershell")
        snippets.append(cmd)
        snippets.append("```\n")
    snippets.append(f"Full step-by-step diagnostic breakdown and rollback steps if needed: https://www.praveentechworld.com/blog/{t['slug']}")
    snippets.append("```\n\n---\n")

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write("\n".join(snippets))

print(f"Successfully generated {OUTPUT_PATH}")

with open(r"c:\Users\bunny\Downloads\00Resume\Building_Tech_Website\scripts\generate_community_snippets.py", "w", encoding="utf-8") as f:
    with open(__file__, "r", encoding="utf-8") as src:
        f.write(src.read())
