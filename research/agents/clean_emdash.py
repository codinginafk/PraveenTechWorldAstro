#!/usr/bin/env python3
"""
Systematic em dash cleanup across all MDX articles.
Patterns to replace:
  1. **Bold** -- text    -> **Bold**: text
  2. ](link) -- text     -> ](link): text (list items)
  3. word -- word         -> word: word (sentence separator)
  4. word--word           -> word, word (in-sentence)
  5. word -- word -- word -> word, word, word (parenthetical)

Usage: python research/agents/clean_emdash.py [--dry-run]
"""

import re, sys, glob
from pathlib import Path

ARTICLES_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "content" / "articles"

def clean_emdash(text: str) -> tuple[str, int]:
    """Apply em dash replacements. Only affects body content, not frontmatter or code blocks."""
    changes = 0

    # Split frontmatter from body
    fm_match = re.match(r'^(---.*?---\s*\n)', text, re.DOTALL)
    if fm_match:
        frontmatter = fm_match.group(1)
        body = text[fm_match.end():]
    else:
        frontmatter = ""
        body = text

    # Split body into code blocks and non-code sections
    parts = re.split(r'(```[\s\S]*?```)', body)
    for i, part in enumerate(parts):
        if part.startswith('```'):
            continue  # skip code blocks

        # Pattern 1: **Bold** -- text  ->  **Bold**: text
        part, n = re.subn(r'\*\*(.+?)\*\*\s*\u2014\s*', r'**\1**: ', part)
        changes += n

        # Pattern 2: ](link) -- text  ->  ](link): text
        part, n = re.subn(r'(\))\s*\u2014\s*', r'\1: ', part)
        changes += n

        # Pattern 3: parenthetical -- X -- Y  ->  (X) Y
        part, n = re.subn(
            r'(?<=[a-zA-Z0-9)])\s*\u2014\s+([^.\u2014]{3,80}?)\s+\u2014\s*(?=[a-zA-Z])',
            r' (\1) ', part
        )
        changes += n

        # Pattern 4: word -- word (sentence separator)
        part, n = re.subn(r'(?<=[a-zA-Z0-9)])\s*\u2014\s+', r': ', part)
        changes += n

        # Pattern 5: word--word (no spaces, in-sentence)
        part, n = re.subn(r'(?<=[a-zA-Z])\u2014(?=[a-zA-Z])', r', ', part)
        changes += n

        # Remaining standalone em dashes
        part, n = re.subn(r'\u2014', r': ', part)
        changes += n

        parts[i] = part

    body = ''.join(parts)
    text = frontmatter + body
    return text, changes


def fix_descriptions(text: str) -> tuple[str, int]:
    """Ensure meta descriptions end with punctuation."""
    changes = 0
    # Find description in frontmatter
    desc_match = re.search(r'^(description:\s*")(.+?)(")', text, re.MULTILINE)
    if desc_match:
        desc = desc_match.group(2)
        if desc and not desc[-1] in '.!?':
            desc = desc + '.'
            text = text[:desc_match.start(2)] + desc + text[desc_match.end(2):]
            changes += 1
    return text, changes


def main():
    dry_run = "--dry-run" in sys.argv

    slugs = sorted(Path(ARTICLES_DIR).glob("*.mdx"))
    total_em_changes = 0
    total_desc_fixes = 0
    per_article = []

    for mdx_path in slugs:
        slug = mdx_path.stem
        text = mdx_path.read_text(encoding="utf-8")
        orig = text

        # Fix em dashes
        text, em_count = clean_emdash(text)
        # Fix descriptions
        text, desc_count = fix_descriptions(text)

        if em_count > 0 or desc_count > 0:
            per_article.append((slug, em_count, desc_count))
            total_em_changes += em_count
            total_desc_fixes += desc_count

            if not dry_run:
                mdx_path.write_text(text, encoding="utf-8")

    # Summary
    print(f"{'='*60}")
    print(f"  EM DASH & DESCRIPTION CLEANUP")
    print(f"  Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"  Articles processed: {len(slugs)}")
    print(f"  Em dash replacements: {total_em_changes}")
    print(f"  Description fixes: {total_desc_fixes}")
    print(f"  Articles changed: {len(per_article)}")
    print(f"{'='*60}")

    if per_article:
        print()
        print("  Changes per article:")
        for slug, em, desc in sorted(per_article, key=lambda x: -x[1]):
            print(f"    {slug[:45]:45s}  em={em:3d}  desc={'Y' if desc else 'N'}")

if __name__ == "__main__":
    main()
