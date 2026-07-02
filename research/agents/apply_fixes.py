#!/usr/bin/env python3
"""
Read audit reports and apply original->rewrite fixes to the corresponding MDX files.
Also checks heading structure (30-50% target for question H2s) and injects
a Quick Summary block at top of body (useful for readers and retrieval).

Usage: python apply_fixes.py [--dry-run] [--pyramid] [--guidance] [slug ...]
  --dry-run:   show what would change without writing
  --pyramid:   check H2 question ratio (target 30-50%) and flag thin sections
  --guidance:  generate and inject Quick Summary at top of body
  slug ...:    one or more slugs to process (default: all reports)
"""

import os, sys, re, glob, json
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
REPORTS_DIR = PROJECT_ROOT / "research" / "agents" / "reports"
ARTICLES_DIR = PROJECT_ROOT / "src" / "content" / "articles"

def parse_fixes(report_path: str) -> list[dict]:
    """Parse original/rewrite pairs from a markdown audit report."""
    content = Path(report_path).read_text(encoding="utf-8")
    fixes = []

    # Pattern: **Original:** \n\n > text \n\n **Rewrite:** \n\n > text
    pattern = r'\*\*Original:\*\*\n\n> ([^\n]+(?:[ \t]*\n[ \t]*[^\n]*)*?)\n\n\*\*Rewrite:\*\*\n\n> ([^\n]+(?:[ \t]*\n[ \t]*[^\n]*)*?)(?=\n\n###|\n\n---|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)

    for orig, rewrite in matches:
        orig = " ".join(orig.replace("> ", "").replace("\n", " ").split())
        rewrite = " ".join(rewrite.replace("> ", "").replace("\n", " ").split())
        fixes.append({"original": orig, "rewrite": rewrite})

    return fixes

def normalize_mdx_text(text: str) -> str:
    """Strip frontmatter and normalize whitespace for matching."""
    text = re.sub(r'^---.*?---\s*', '', text, count=1, flags=re.DOTALL)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def find_best_match(mdx_text: str, mdx_path: str, original: str) -> tuple | None:
    """Try multiple strategies to find original text in MDX. Returns (start, end) or None."""
    candidates = [
        ("exact", lambda: mdx_text.find(original)),
        ("strip bold", lambda: mdx_text.find(original.replace("**", ""))),
        ("normalize ws", lambda: mdx_text.find(re.sub(r'\s+', ' ', original).strip())),
    ]

    for label, fn in candidates:
        pos = fn()
        if pos != -1:
            return (pos, pos + len(original)), label

    # Fuzzy: strip leading/trailing markdown symbols
    stripped = original.strip(" *_:")
    pos = mdx_text.find(stripped)
    if pos != -1:
        return (pos, pos + len(stripped)), "stripped"

    return None

def normalize_ws(text: str) -> str:
    return re.sub(r'\s+', ' ', text).strip()

def normalize_unicode(text: str) -> str:
    return (text.replace('\u2018', "'").replace('\u2019', "'")
                .replace('\u201c', '"').replace('\u201d', '"')
                .replace('\u2013', '-').replace('\u2014', '--'))

def mdx_find(mdx_raw: str, original: str) -> tuple | None:
    """Find original text in raw MDX (including frontmatter). Returns (start, end) or None."""
    mdx_norm = normalize_unicode(mdx_raw)
    orig = normalize_unicode(original)
    orig_norm = normalize_ws(orig)

    # Build all reasonable candidate forms of the original text
    candidates = [
        orig,                    # original (normalized unicode)
        orig_norm,               # collapsed whitespace
        orig.replace("**", ""),  # bold markers removed
        orig_norm.lower(),       # case-insensitive
    ]

    # Also try: handle "**text** :" (space before colon after bold)
    flex = re.sub(r'\*\*(.+?)\*\*\s*:', r'**\1**:', orig)
    if flex != orig:
        candidates.append(flex)
        candidates.append(normalize_ws(flex))

    for candidate in candidates:
        idx = mdx_raw.find(candidate)
        if idx != -1:
            return (idx, idx + len(candidate))

    # Last resort: search normalized text and back-map to original positions
    for candidate in candidates:
        c_norm = normalize_unicode(candidate)
        idx = mdx_norm.lower().find(c_norm.lower())
        if idx != -1:
            actual = mdx_raw[idx:idx + len(candidate)]
            if actual:
                return (idx, idx + len(candidate))

    return None

def _is_in_frontmatter(mdx_raw: str, pos: int) -> bool:
    """Check if a position in the file is inside the YAML frontmatter (between ---)."""
    fm_end = mdx_raw.find("---\n", 3) if mdx_raw.startswith("---") else -1
    if fm_end == -1:
        fm_end = mdx_raw.find("---\r\n", 3)
    return fm_end != -1 and pos < fm_end + 3

def apply_fixes(mdx_path: str, fixes: list[dict], dry_run: bool = False) -> tuple[int, list[str]]:
    """Apply fixes to an MDX file. Returns (count_applied, log_lines)."""
    mdx_raw = Path(mdx_path).read_text(encoding="utf-8")
    applied = 0
    log = []
    applied_ranges = []  # track replaced ranges to avoid duplicates

    for fix in fixes:
        orig = fix["original"]
        rewrite = fix["rewrite"]

        if orig.strip() == rewrite.strip():
            log.append(f"  [SKIP] No change needed: {orig[:60]}")
            continue

        result = mdx_find(mdx_raw, orig)
        if not result:
            # Try progressive shortening / whitespace normalization
            for shorten in [normalize_ws(orig), orig.strip(". \t\r\n"), orig.replace("**", "")]:
                if len(shorten) >= 10 and normalize_ws(shorten) != normalize_ws(orig):
                    result = mdx_find(mdx_raw, shorten)
                    if result:
                        orig = shorten
                        break

        if not result:
            log.append(f"  [MISS] Could not find: {orig[:80]}")
            continue

        start, end = result

        # Skip if inside frontmatter
        if _is_in_frontmatter(mdx_raw, start):
            log.append(f"  [SKIP] In frontmatter: {orig[:60]}")
            continue

        # Skip if overlapping previously applied fix
        overlap = any(max(s, start) < min(e, end) for s, e in applied_ranges)
        if overlap:
            log.append(f"  [SKIP] Overlaps previous fix: {orig[:60]}")
            continue

        mdx_raw = mdx_raw[:start] + rewrite + mdx_raw[end:]
        applied_ranges.append((start, start + len(rewrite)))
        applied += 1
        log.append(f"  [OK] Replaced: {orig[:60]}...")

    if not dry_run and applied > 0:
        Path(mdx_path).write_text(mdx_raw, encoding="utf-8")
        log.append(f"  [SAVED] {applied} fix(es) written to {mdx_path}")

    return applied, log

def slug_from_report(report_path: str) -> str:
    return Path(report_path).stem

def safe_print(text):
    """Print with fallback encoding for Unicode characters."""
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode('ascii', 'replace').decode('ascii'))

# ─── Inverted Pyramid / Answer Block Enforcement ──────────────────────

def h2_is_question(h2_text: str) -> bool:
    """Check if an H2 heading is formatted as a question."""
    q_words = r'(?i)\b(what|how|why|when|where|who|which|can|does|is|are|do|will|should|could|would|have|has|did)'
    return bool(re.match(q_words, h2_text.strip())) or h2_text.strip().endswith("?")

def enforce_inverted_pyramid(mdx_text: str) -> tuple[str, int]:
    """
    Encourage 30-50% of H2s to be questions (not forced on every heading).
    Each H2 should be followed by a concise answer paragraph, then deeper explanation.
    Returns (new_text, changes).
    """
    changes = 0
    body = re.sub(r'^---.*?---\s*', '', mdx_text, count=1, flags=re.DOTALL)
    frontmatter = mdx_text[:len(mdx_text) - len(body)]

    lines = body.split("\n")
    h2_count = 0
    question_h2_count = 0
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        h2 = re.match(r'^##\s+(.+)$', line)
        if h2:
            h2_text = h2.group(1)
            result.append(line)
            h2_count += 1
            if h2_is_question(h2_text):
                question_h2_count += 1

            # Check next non-empty lines have substantial content
            next_lines = []
            j = i + 1
            while j < len(lines) and not lines[j].strip().startswith("##"):
                if lines[j].strip():
                    next_lines.append(lines[j].strip())
                j += 1
            next_text = " ".join(next_lines)

            # Flag only if section is nearly empty
            if not next_text or len(next_text.split()) < 15:
                result.append(f"<!-- NOTE: Section after \"{h2_text}\" is thin — consider adding a lead paragraph then deeper explanation -->")
                changes += 1
            i = j - 1
        else:
            result.append(line)
        i += 1

    # Add advisory comment if question ratio is far from 30-50%
    if h2_count >= 4:
        ratio = question_h2_count / h2_count
        if ratio < 0.2:
            result.append(f"\n<!-- NOTE: Only {question_h2_count}/{h2_count} H2s are questions ({ratio:.0%}). Aim for 30-50% question-formatted headings naturally. -->")
        elif ratio > 0.7:
            result.append(f"\n<!-- NOTE: {question_h2_count}/{h2_count} H2s are questions ({ratio:.0%}). Don't force every heading — aim for 30-50% naturally. -->")

    return frontmatter + "\n".join(result), changes


# ─── LLM Guidance Summary ─────────────────────────────────────────────

def generate_llm_guidance(body: str, title: str = "") -> str:
    """Generate a 3-bullet machine-readable markdown summary for LLM Guidance."""
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_API_KEY")
    if not api_key:
        return ""
    base_url = os.environ.get("OPENAI_BASE_URL") or os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1")
    model = os.environ.get("LLM_MODEL", "gpt-4o-mini")
    client = OpenAI(api_key=api_key, base_url=base_url)

    prompt = f"""Generate a 3-4 bullet summary for this article.
Each bullet should be a concise takeaway — useful for both human readers and retrieval.
Format: under 50 words each, covering: (1) what problem this solves, (2) the key approach/method, (3) the specific result/outcome, (4) any original data or experiment.

Title: {title}

Article:
{body[:4000]}
"""
    try:
        r = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "Output a 3-bullet markdown summary. No introduction, no explanation."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=512,
        )
        return r.choices[0].message.content.strip() or ""
    except Exception:
        return ""


def inject_guidance_summary(mdx_text: str) -> tuple[str, str]:
    """
    Generate and inject an LLM Guidance summary block at the top of the body.
    Returns (new_text, summary_block).
    """
    fm_end = mdx_text.find("---\n", 3) if mdx_text.startswith("---") else -1
    if fm_end == -1:
        fm_end = mdx_text.find("---\r\n", 3)
    fm_end = fm_end + 4 if fm_end != -1 else 0

    body = mdx_text[fm_end:]
    title_match = re.search(r'title:\s*"(.+?)"', mdx_text[:fm_end])
    title = title_match.group(1) if title_match else ""

    summary = generate_llm_guidance(body, title)
    if not summary:
        return mdx_text, ""

    # Strip any existing guidance block first
    body_clean = re.sub(r'^> \*\*LLM Guidance:\*\*.*?(\n> .*)*\n\n', '', body, count=1, flags=re.DOTALL)
    guidance_block = f"> **LLM Guidance:**\n> {summary.replace(chr(10), chr(10)+'> ')}\n\n"
    result = mdx_text[:fm_end] + guidance_block + body_clean
    return result, guidance_block


def main():
    do_pyramid = "--pyramid" in sys.argv
    do_guidance = "--guidance" in sys.argv
    dry_run = "--dry-run" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]

    report_files = sorted(glob.glob(str(REPORTS_DIR / "*.md")))

    # If specific slugs given, filter
    if args:
        wanted = set(args)
        report_files = [f for f in report_files if Path(f).stem in wanted]

    total_fixes = 0
    total_applied = 0
    total_missed = 0

    pyramid_total = 0
    guidance_total = 0

    for report_path in report_files:
        slug = slug_from_report(report_path)
        mdx_path = ARTICLES_DIR / f"{slug}.mdx"

        if not mdx_path.exists():
            safe_print(f"[SKIP] {slug}: no matching MDX file")
            continue

        fixes = parse_fixes(report_path)
        if not fixes:
            safe_print(f"[SKIP] {slug}: no fixes found in report")
            continue

        safe_print(f"\n{'='*60}")
        safe_print(f"  {slug} ({len(fixes)} fixes)")
        safe_print(f"{'='*60}")

        count, log_lines = apply_fixes(str(mdx_path), fixes, dry_run=dry_run)

        for line in log_lines:
            safe_print(line)

        missed = len(fixes) - count
        total_fixes += len(fixes)
        total_applied += count
        total_missed += missed

        # Inverted Pyramid enforcement
        if do_pyramid:
            mdx_text = mdx_path.read_text(encoding="utf-8")
            pyr_text, pyr_changes = enforce_inverted_pyramid(mdx_text)
            if pyr_changes > 0:
                pyramid_total += pyr_changes
                if not dry_run:
                    mdx_path.write_text(pyr_text, encoding="utf-8")
                safe_print(f"  [PYRAMID] {pyr_changes} H2 heading(s) flagged")

        # LLM Guidance injection
        if do_guidance:
            mdx_text = mdx_path.read_text(encoding="utf-8")
            new_text, summary = inject_guidance_summary(mdx_text)
            if summary:
                guidance_total += 1
                if not dry_run:
                    mdx_path.write_text(new_text, encoding="utf-8")
                safe_print(f"  [GUIDANCE] LLM guidance summary injected")

    safe_print(f"\n{'='*60}")
    safe_print(f"  SUMMARY:")
    safe_print(f"  Total fixes found:  {total_fixes}")
    safe_print(f"  Applied:            {total_applied}")
    safe_print(f"  Missed:             {total_missed}")
    if do_pyramid:
        safe_print(f"  H2 pyramid flags:   {pyramid_total}")
    if do_guidance:
        safe_print(f"  Guidance injected:  {guidance_total}")
    if dry_run:
        safe_print(f"  Mode:               DRY RUN (no files written)")
    else:
        safe_print(f"  Mode:               LIVE (files updated)")
    safe_print(f"{'='*60}")


if __name__ == "__main__":
    main()
