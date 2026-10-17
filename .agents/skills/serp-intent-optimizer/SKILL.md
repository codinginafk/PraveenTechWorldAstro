---
name: serp-intent-optimizer
version: 1.0.0
description: |
  Repeatable SERP, Keyword Research, and Impression-to-Click Conversion Skill for PraveenTechWorld.
  Integrates Desktop KeywordResearch tool suite (score_title, find_flow, data.db) with Google Search Console telemetry,
  strict title protection gates (protect >5% CTR), verbatim query frontloading, and 134-167 word passage citability blocks.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - RunCommand
---

# SERP & Keyword Research Optimization Engine (Impressions-to-Clicks Conversion)

Use this skill whenever the user asks to:
- "work on keyword research"
- "convert impressions to clicks" / "imp to clicks"
- "optimize serp" / "fix low ctr"
- "improve rankings to 1-3"
- "retest titles and subtitles"

---

## 1. Primary Tool Integration: Desktop KeywordResearch Suite

All keyword research and title scoring MUST interface with the specialized tool suite located at:
`C:\Users\bunny\OneDrive\Desktop\KeywordResearch`

### Key Modules:
1. **`app.score_title(title, query, platform="google")`**:
   - Scores candidate titles on a strict 0–100 rubric.
   - **Length**: 45 to 60 characters for Google (+22 pts). Over 60 gets penalized (+5).
   - **Query Match**: Every query word present (+20 pts).
   - **Frontloading**: Exact search query placed in the first 35% of characters (+10 pts).
   - **Numbers**: Odd numbers like 3, 5, 7 (+11 pts total: +8 for digits, +3 for odd).
   - **Freshness**: Current year anchor (e.g. `2026`) (+4 pts).
   - **Separators**: `:` or `-` structure (+4 pts).
   - **Curiosity Hooks**: `(why|what|truth|tested|real|actually|fixed|fastest)` (+5 pts).
   - **Anti-Slop Penalties**: Banned filler (`ultimate guide`, `comprehensive overview`, `mastering`, `game-changing`, `everything you need to know`, `in this article`) (-15 pts).
   - **Formatting Penalties**: All-caps words (-6 pts) or multiple punctuation `!!` / `??` (-6 pts).
   - **Pass Threshold**: A winning title must score **>= 70 / 100**.

2. **`app.find_flow({"seed": seed, "sources": ["google", "duckduckgo"]})`**:
   - Queries live autocomplete suggestion endpoints across Google and DuckDuckGo.
   - Returns real user queries, suggest strength (1–9), intent classification, and question flags.
   - Used to extract **high-intent H2 subtitles** (e.g. `## Why Does My Bluetooth Keep Disappearing?`, `## How To Fix Volume Slider Stuck on Screen`).

3. **Local Database (`data.db`)**:
   - SQLite store containing **4,852 site-specific queries** mapped from Google Search Console for `praveentechworld.com`.
   - Always query `gsc_queries` and `kw_stats` to verify real impression volume before choosing targets.

---

## 2. Strict Title Protection Rules (Never Break What Works)

Whenever evaluating existing content, you must categorize every article into one of three tiers:

### Tier 1: PROTECTED (Keep 100% Intact)
* **Criteria**: Clicks > 100, or CTR > 5.0%, or Average Position <= 2.5 in Google Search Console.
* **Rule**: **NEVER modify the `<title>` or `seoTitle`.**
* **Example**: `degoogle-starter-pack-complete-guide` (684 clicks, 29.33% CTR, Pos 2.0). Changing a #1-#2 ranking title with 30% CTR can destroy rankings.
* **Allowed Actions**: Only update on-page H2s, tables, and passage citability capsules.

### Tier 2: SURGICAL REFINEMENT (Protect Winning Base)
* **Criteria**: CTR between 1.0% and 3.0% with healthy clicks (30–90 clicks).
* **Rule**: Retain the exact high-performing frontload phrase. Only append an odd-number test count or year anchor.
* **Example**: `fix-dism-0x800f0915-efi-system-partition-too-small` (77 clicks, 1.21% CTR). Keep `Fix DISM Error 0x800f0915 on Windows 11` verbatim, only adding `: 5 Tested Fixes (2026)`.

### Tier 3: UPGRADE CANDIDATES (Low CTR or Broken)
* **Criteria**: CTR < 0.8% with high impressions (> 1,500), or truncated frontmatter titles.
* **Rule**: Rewrite title using the `score_title` rubric until score >= 70 pts.
* **Example**:
  - `why-wsl2-vmmem-wont-free-ram`: Truncated bug (`"Why WSL2 vmmem Won"`) -> Upgrade to `Why WSL2 vmmem Won't Free RAM: 5 Tested Fixes (2026)`.
  - `windows-11-volume-control-not-working`: 8.3k impressions, 0.67% CTR -> Searchers type `volume slider` -> Upgrade to `Windows 11 Volume Slider Not Working? 7 Tested Fixes (2026)`.

---

## 3. Passage Citability & AI Overview Standard (claude-seo)

For every optimized article:
1. **The 134–167 Word Rule**:
   - Embed an authoritative, self-contained quick answer block directly beneath the primary H2.
   - Must hit **134 to 167 words**. This is the empirical passage length preferred by Google AI Overviews and Perplexity for direct citation.
2. **First-Person Workbench Evidence**:
   - Lead with verbatim test conditions: *"We tested this on Windows 11 24H2 build 26100 with an RTX 4060..."*
   - Avoid generic third-person theory.
3. **Question-Form Headings**:
   - Convert generic H2s into questions extracted by `find_flow`:
     - Bad: `## Overview`
     - Good: `## Why Does Windows 11 Volume Slider Stop Working?`

---

## 4. Freshness & Metadata Plumbing

1. In Frontmatter:
   - Set `updatedDate: "YYYY-MM-DD"` (e.g. `2026-10-08`).
   - Title < 60 characters.
   - Description < 155 characters with explicit action outcome.
2. In Templates:
   - Feeds `<meta property="article:modified_time">` and Schema.org `dateModified`.
   - Triggers the on-page emerald `"Updated on [Date]"` freshness badge.

---

## 5. Automated Execution Script

Run the built-in optimizer tool at any time:
```powershell
# Test a title against a query
python scripts/serp_keyword_optimizer.py --query "windows 11 volume slider" --title "Windows 11 Volume Slider Not Working? 7 Tested Fixes (2026)"

# Discover live Google/DDG autocomplete suggestions & user questions
python scripts/serp_keyword_optimizer.py --query "windows 11 bluetooth disappeared"
```
