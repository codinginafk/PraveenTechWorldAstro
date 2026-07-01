#!/usr/bin/env python3
"""
Check meta titles, descriptions, and FAQ quality across all 69 articles.
Usage: python research/agents/check_meta_faq.py [--scrape] [--report REPORT.md]
  --scrape:  Fetch live HTML from production to get rendered <title> and <meta description>
  --report:  Output file for the full report (default: meta-faq-audit.md)
"""

import os, sys, re, glob, json, math
from pathlib import Path
from datetime import datetime

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
ARTICLES_DIR = PROJECT_ROOT / "src" / "content" / "articles"
REPORTS_DIR = PROJECT_ROOT / "research" / "agents" / "reports"

import httpx
from bs4 import BeautifulSoup

SITE_BASE = "https://www.praveentechworld.com"
import urllib.parse

# ─── Helpers ────────────────────────────────────────────────────────────

def estimate_px(text: str) -> int:
    """Rough pixel width estimate (Arial 16px, used by Screaming Frog)."""
    widths = {
        'a': 8.8, 'b': 9.6, 'c': 8.4, 'd': 9.6, 'e': 8.6, 'f': 5.4,
        'g': 8.4, 'h': 9.0, 'i': 3.6, 'j': 3.6, 'k': 8.4, 'l': 3.6,
        'm': 14.4, 'n': 9.0, 'o': 8.8, 'p': 9.0, 'q': 8.8, 'r': 5.4,
        's': 7.8, 't': 5.4, 'u': 9.0, 'v': 8.4, 'w': 12.0, 'x': 8.4,
        'y': 8.4, 'z': 7.8, 'A': 10.8, 'B': 10.2, 'C': 11.4, 'D': 12.0,
        'E': 9.6, 'F': 9.0, 'G': 12.0, 'H': 12.0, 'I': 4.2, 'J': 7.8,
        'K': 10.2, 'L': 9.0, 'M': 14.4, 'N': 12.0, 'O': 12.6, 'P': 10.2,
        'Q': 12.6, 'R': 10.8, 'S': 9.6, 'T': 10.2, 'U': 12.0, 'V': 10.8,
        'W': 15.6, 'X': 10.2, 'Y': 10.2, 'Z': 9.6, '0': 9.6, '1': 9.6,
        '2': 9.6, '3': 9.6, '4': 9.6, '5': 9.6, '6': 9.6, '7': 9.6,
        '8': 9.6, '9': 9.6, ' ': 4.8, '.': 3.6, ',': 3.6, '!': 4.8,
        '?': 8.4, "'": 3.6, '"': 6.0, '-': 4.8, ':': 4.8, ';': 4.8,
        '(': 4.8, ')': 4.8, '/': 4.8, '\\': 4.8, '@': 14.4, '#': 9.6,
        '$': 9.6, '%': 14.4, '^': 6.0, '&': 10.8, '*': 6.0, '_': 6.0,
        '+': 9.6, '=': 9.6, '<': 9.6, '>': 9.6, '~': 7.8, '`': 4.8,
    }
    if not text:
        return 0
    return int(sum(widths.get(c, 9.0) for c in text))

# ─── Scraper ────────────────────────────────────────────────────────────

def fetch_meta(url: str) -> dict | str:
    """Fetch a URL and extract <title> and <meta name=description>."""
    try:
        r = httpx.get(url, follow_redirects=True, timeout=20,
                      headers={"User-Agent": "Mozilla/5.0 (compatible; MetaChecker/1.0)"})
        r.raise_for_status()
    except Exception as e:
        return {"error": str(e)}
    soup = BeautifulSoup(r.text, "html.parser")
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""
    meta_desc = soup.find("meta", attrs={"name": "description"})
    description = meta_desc.get("content", "").strip() if meta_desc else ""
    return {"title": title, "description": description, "status": r.status_code}

# ─── FAQ Parsing ────────────────────────────────────────────────────────

def parse_faqs(mdx_text: str) -> list[dict]:
    """Extract FAQ items from an MDX file's ## FAQ section."""
    faqs = []
    # Find ## FAQ section
    faq_match = re.search(r'^##\s*FAQ\s*$', mdx_text, re.MULTILINE)
    if not faq_match:
        return faqs
    faq_section = mdx_text[faq_match.end():]
    # Stop at next ## heading or end
    next_h = re.search(r'^##\s', faq_section, re.MULTILINE)
    if next_h:
        faq_section = faq_section[:next_h.start()]

    # Find Q/A pairs: ### Question? or **Question?**
    blocks = re.split(r'\n(?=###\s|\*\*)', faq_section.strip())
    current_q = None
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        # Check if this starts a new question
        q_match = re.match(r'(?:###\s)?\*\*(.+?\?)\*\*', block)
        if q_match:
            if current_q:
                faqs.append(current_q)
            current_q = {"question": q_match.group(1).strip(), "answer": ""}
            # Rest is the answer
            rest = block[q_match.end():].strip()
            if rest:
                current_q["answer"] = rest
        elif current_q:
            current_q["answer"] += "\n" + block

    if current_q:
        faqs.append(current_q)

    # Fallback: simple ### Question pattern
    if not faqs:
        qa_pairs = re.findall(
            r'###\s+\*\*(.+?\?)\*\*\s*\n+(.*?)(?=\n###|\n---|\Z)',
            faq_section, re.DOTALL
        )
        for q, a in qa_pairs:
            faqs.append({"question": q.strip(), "answer": a.strip()})

    return faqs

# ─── Main ───────────────────────────────────────────────────────────────

def main():
    do_scrape = "--scrape" in sys.argv
    out_path = None
    for a in sys.argv[1:]:
        if a.startswith("--report="):
            out_path = a.split("=", 1)[1]

    if not out_path:
        out_path = str(REPORTS_DIR.parent / "meta-faq-audit.md")

    slugs = sorted([p.stem for p in ARTICLES_DIR.glob("*.mdx")])
    results = []

    for i, slug in enumerate(slugs, 1):
        mdx_path = ARTICLES_DIR / f"{slug}.mdx"
        mdx_text = mdx_path.read_text(encoding="utf-8")

        # Extract frontmatter
        fm = {}
        fm_match = re.search(r'^---\s*\n(.*?)\n---', mdx_text, re.DOTALL)
        if fm_match:
            for line in fm_match.group(1).split("\n"):
                kv = line.split(":", 1)
                if len(kv) == 2:
                    fm[kv[0].strip()] = kv[1].strip().strip('"').strip("'")

        title_fm = fm.get("title", "")
        desc_fm = fm.get("description", "")

        # Check FAQ section
        faqs = parse_faqs(mdx_text)

        # Meta from production (optional)
        meta = {}
        if do_scrape:
            url = f"{SITE_BASE}/blog/{slug}"
            meta = fetch_meta(url)

        results.append({
            "slug": slug,
            "title_fm": title_fm,
            "desc_fm": desc_fm,
            "faqs": faqs,
            "faq_count": len(faqs),
            "meta": meta,
        })

        print(f"[{i}/{len(slugs)}] {slug}: title={len(title_fm)}ch desc={len(desc_fm)}ch faqs={len(faqs)}", end="")
        if do_scrape and "title" in meta:
            print(f" meta_title={len(meta.get('title',''))}ch meta_desc={len(meta.get('description',''))}ch", end="")
        print()

    # ─── Report ──────────────────────────────────────────────────────
    lines = []
    lines.append("# Meta, Description & FAQ Audit")
    lines.append(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"**Articles:** {len(results)}")
    lines.append(f"**Source:** {'Production HTML (scraped)' if do_scrape else 'MDX frontmatter only'}")
    lines.append("")

    # ── Titles ───────────────────────────────────────────────────────
    lines.append("## Meta Titles")
    lines.append("")
    lines.append("| Slug | FM Title | FM Length | Px Est | Issues |")
    lines.append("|------|----------|-----------|--------|--------|")

    title_issues = 0
    for r in sorted(results, key=lambda x: len(x["title_fm"]), reverse=True):
        issues = []
        t = r["title_fm"]
        if not t:
            issues.append("MISSING")
        elif len(t) < 20:
            issues.append("Too short")
        elif len(t) > 70:
            issues.append(f"Too long ({len(t)}ch)")
        px = estimate_px(t)
        if px > 561:
            issues.append(f"Px overflow ({px}px)")
        if t and "|" not in t:
            issues.append("No brand separator")
        # Check if title matches a known pattern
        if t and t.endswith("PraveenTech World"):
            pass  # OK
        elif t and t.endswith("PTW"):
            pass  # OK
        elif t and t.endswith("PraveenTechWorld"):
            pass  # OK
        elif t:
            issues.append("Non-standard brand suffix")

        if issues:
            title_issues += 1

        lines.append(f"| {r['slug'][:40]} | {t[:50]} | {len(t)} | {px} | {', '.join(issues[:3])} |")

    lines.append("")
    lines.append(f"**Total title issues: {title_issues}/{len(results)}**")
    lines.append("")

    # ── Descriptions ─────────────────────────────────────────────────
    lines.append("## Meta Descriptions")
    lines.append("")
    lines.append("| Slug | FM Description (first 70) | Length | Issues |")
    lines.append("|------|---------------------------|--------|--------|")

    desc_issues = 0
    for r in sorted(results, key=lambda x: len(x["desc_fm"]), reverse=True):
        issues = []
        d = r["desc_fm"]
        if not d:
            issues.append("MISSING")
        elif len(d) < 80:
            issues.append(f"Too short ({len(d)}ch)")
        elif len(d) > 165:
            issues.append(f"Too long ({len(d)}ch)")
        if d and not d.endswith(".") and not d.endswith("!") and not d.endswith("?"):
            issues.append("No ending punctuation")
        if d and "|" in d:
            pass
        if d and len(d) > 50 and "," not in d:
            pass  # not necessarily an issue
        # Check for truncated descriptions
        if d and d.strip().endswith('"') and not d.strip().endswith('"') == d.strip().count('"'):
            pass

        if issues:
            desc_issues += 1

        lines.append(f"| {r['slug'][:40]} | {d[:70]} | {len(d)} | {', '.join(issues[:2])} |")

    lines.append("")
    lines.append(f"**Total description issues: {desc_issues}/{len(results)}**")
    lines.append("")

    # ── FAQs ─────────────────────────────────────────────────────────
    lines.append("## FAQ Sections")
    lines.append("")
    lines.append("| Slug | FAQ Count | Avg Q Len | Avg A Len | Issues |")
    lines.append("|------|-----------|-----------|-----------|--------|")

    faq_issues_total = 0
    no_faq = 0
    for r in sorted(results, key=lambda x: x["faq_count"], reverse=False):
        issues = []
        faqs = r["faqs"]
        count = len(faqs)

        if count == 0:
            issues.append("No FAQ section")
            no_faq += 1
        else:
            avg_qlen = sum(len(f["question"]) for f in faqs) / count
            avg_alen = sum(len(f["answer"]) for f in faqs) / count
            r["avg_qlen"] = round(avg_qlen, 0)
            r["avg_alen"] = round(avg_alen, 0)

            if count < 3:
                issues.append(f"Only {count} FAQ(s), aim for 3-5")
            if avg_qlen < 20:
                issues.append(f"Avg Q too short ({avg_qlen:.0f}ch)")
            if avg_alen < 100:
                issues.append(f"Avg A too short ({avg_alen:.0f}ch)")
            if count > 8:
                issues.append(f"Too many FAQ items ({count})")

            # Check for one-word answers
            short_answers = sum(1 for f in faqs if len(f["answer"].split()) < 10)
            if short_answers > count // 2:
                issues.append(f"{short_answers}/{count} answers are very short")

            # Check if questions are real search queries
            qwords = sum(len(f["question"].split()) for f in faqs) / count
            if qwords < 5:
                issues.append(f"Q's avg {qwords:.0f} words (aim 6+)")

            if issues:
                faq_issues_total += 1

        if count > 0:
            lines.append(f"| {r['slug'][:40]} | {count} | {r.get('avg_qlen', '-'):.0f} | {r.get('avg_alen', '-'):.0f} | {', '.join(issues[:2])} |")
        else:
            lines.append(f"| {r['slug'][:40]} | 0 | - | - | No FAQ section |")

    lines.append("")
    lines.append(f"**Pages without FAQ: {no_faq}/{len(results)}**")
    lines.append(f"**Pages with FAQ issues: {faq_issues_total}/{len(results)}**")
    lines.append("")

    # ── Scraped meta comparison ──────────────────────────────────────
    if do_scrape:
        lines.append("## Rendered Meta (from production HTML)")
        lines.append("")
        mismatch_count = 0
        for r in sorted(results, key=lambda x: x["slug"]):
            meta = r.get("meta", {})
            if "error" in meta:
                lines.append(f"| {r['slug'][:40]} | ERROR: {meta['error']} |")
                continue
            mt = meta.get("title", "")
            md = meta.get("description", "")
            # Compare with frontmatter
            fm_t = r["title_fm"]
            fm_d = r["desc_fm"]
            issues = []
            if fm_t and mt and fm_t not in mt:
                issues.append("Title mismatch")
            if fm_d and md and fm_d not in md:
                issues.append("Description mismatch")
            if mt and estimate_px(mt) > 561:
                issues.append(f"Title px overflow ({estimate_px(mt)}px)")
            if mt and len(mt) > 70:
                issues.append(f"Title too long ({len(mt)}ch)")
            if md and len(md) > 165:
                issues.append(f"Desc too long ({len(md)}ch)")
            if md and len(md) < 80:
                issues.append(f"Desc too short ({len(md)}ch)")
            if not mt:
                issues.append("MISSING <title>")
            if not md:
                issues.append("MISSING <meta>")

            if issues:
                mismatch_count += 1
            lines.append(f"| {r['slug'][:40]} | {len(mt)}ch / {len(md)}ch | {', '.join(issues[:3])} |")

        lines.append("")
        lines.append(f"**Total rendered meta issues: {mismatch_count}/{len(results)}**")

    # ── Save ─────────────────────────────────────────────────────────
    Path(out_path).write_text("\n".join(lines), encoding="utf-8")
    print(f"\nReport saved to: {out_path}")

if __name__ == "__main__":
    main()
