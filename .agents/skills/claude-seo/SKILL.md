---
name: claude-seo
version: 2.0.0
description: |
  Universal SEO Intelligence & Citability Skill adapted from AgriciDaniel/claude-seo for Antigravity.
  Provides AI search optimization (GEO/AEO), passage citability scoring (134-167 word answer blocks),
  falsifiable SEO recommendations, 2026 Schema deprecation filtering (no FAQPage/HowTo rich snippet assumptions),
  and technical Core Web Vitals (INP/LCP) validation.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - RunCommand
---

# Claude SEO: Primary-Source SEO & Citability Intelligence

This skill adapts the principles and execution standards of AgriciDaniel/claude-seo to Antigravity and the PraveenTechWorld engineering pipeline. It aligns site architecture, article copy, and diagnostic tools with Google Search Essentials, the Search Quality Rater Guidelines (E-E-A-T), and AI Search Optimization (Google AI Overviews, Gemini, Perplexity).

---

## 1. Core Operating Principles

1. **AI-Search First (GEO / AEO)**:
   - Aligned with Google AI Optimization Guide: AEO and GEO are grounded in the same ranking systems as classic Search. Pages must be indexed, fast, and eligible for rich snippet display.
   - **Passage Citability Scoring**: Standalone answer capsules directly beneath H2 headings must hit **134 to 167 words**. This is the empirical passage length preferred by Google AI Overviews and Perplexity for direct citation.
2. **Falsifiability, Not Promotional Promises**:
   - Every recommendation or content pivot must carry:
     - The **first-principle observation** it rests on.
     - The **leading indicator** (e.g. GSC impressions in days 7-14).
     - An explicit **how would we know this failed?** check.
3. **Strict 2026 Schema Deprecation Filtering**:
   - **Never recommend or rely on deprecated schema types**:
     - FAQPage: Google officially removed FAQ rich results for all regular sites on May 7, 2026. Do NOT write FAQ schemas expecting rich drop-down stars/cards.
     - HowTo: Rich results removed by Google in September 2023.
     - SpecialAnnouncement, ClaimReview, LearningVideo: Retired 2024-2025.
   - **Enforce active, high-impact types**:
     - TechArticle / Article with complete author entity (Person + Organization).
     - SoftwareApplication / WebApplication for interactive developer tools.
     - ItemPage and BreadcrumbList.

---

## 2. The 5-Pillar Audit Workflow

When auditing an article, cluster, or tool, evaluate across five distinct pillars:

### Pillar 1: Passage Citability & AI Answer Architecture
- **Direct Answer Block**: Does the article have a 60-word bold lead or a 134-167 word self-contained summary in the first 15% of the page?
- **Question-Based Heading Hierarchy**: Are H2s formulated as natural user inquiries (e.g. Why Does WSL2 vmmem Not Free Memory After Docker Closes?) rather than vague labels (Overview or Details)?
- **Attribution & First-Party Evidence**: Does the article include primary-source data (reproducible benchmarks, ASCII circuit/memory diagrams, PowerShell scripts, error codes) that AI summaries cannot invent?

### Pillar 2: Search Intent & Striking-Distance Telemetry
- Inspect Google Search Console queries with positions **5.0 to 18.0**.
- If impressions are high (>500) but clicks are low (CTR < 1.0%), evaluate:
  - Is the query phrase placed in the <title> within the first 40 characters?
  - Does the meta description contain a decisive, click-enticing outcome under 155 characters?
  - Is the article suffering from keyword cannibalization against another page on the same domain?

### Pillar 3: Topical Drift & Cannibalization Sentinel
- Before writing or editing an article, scan src/content/articles/ for semantic overlap.
- If two or more articles target identical search intent (e.g. Will reinstalling Windows fix blue screens vs Will reinstalling Windows fix viruses), enforce **Cluster Consolidation**: merge into a definitive master runbook and redirect/draft the duplicates.

### Pillar 4: Technical & Core Web Vitals (INP Focus)
- Target metric thresholds:
  - **INP (Interaction to Next Paint)**: < 200ms. (Replaced legacy FID).
  - **LCP (Largest Contentful Paint)**: < 2.5s.
  - **CLS (Cumulative Layout Shift)**: < 0.1.
- In Astro: CSS must be inlined for critical above-the-fold HTML; hero images must have explicit width/height to eliminate layout shifts.

### Pillar 5: Developer Backlink Magnetism
- Pure text articles rarely earn spontaneous editorial links from third-party developers.
- Every flagship runbook must ship with at least one **standalone, copy-paste developer artifact**:
  - A production PowerShell or Bash verification script.
  - A multi-tier hardware benchmark or troubleshooting matrix.
  - An interactive browser calculator or generator.

---

## 3. How to Execute an Audit

When asked to audit a page, article, or topic using claude-seo:

1. **Read Target Content**: Inspect the MDX file, frontmatter metadata, word count, and heading structure.
2. **Run Citability Check**: Count words in the opening direct answer block (Target: 134-167 words). Verify zero AI fluff.
3. **Verify Intent & SERP Reality**: Compare the title against actual user search strings from GSC.
4. **Output Falsifiable Action Plan**: Deliver findings in a structured matrix with specific code changes, expected CTR impact, leading indicators, and failure criteria.
