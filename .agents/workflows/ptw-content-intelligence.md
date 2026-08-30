---
title: PTW content intelligence cycle
description: Monitor GSC, Bing, Reddit, and technical forums; compare signals with published coverage; then prepare bounded article improvements or one new draft.
---

# PTW content intelligence cycle

Run this workflow inside the PraveenTechWorld project. Follow `.agents/rules/ptw-content-intelligence.md` and all higher-priority workspace rules.

## 1. Preflight

1. Read `.agents/AGENTS.md`, `.agents/SYSTEM_DIRECTIVE.md`, `research/agents/state.json`, `content_pillars_and_topic_engine.md`, `research/sources/config.json`, and `docs/antigravity/ptw-click-growth-strategy.md`.
2. Apply the current global traffic mandate in `.agents/rules/ptw-content-intelligence.md`. Older exclusions against Linux, gaming, consumer hardware, comparisons, and sustained trends no longer control topic selection.
3. Inspect `git status --short`. Preserve all unrelated and pre-existing changes.
4. Check `research/agents/state.json.contentIntelligence` for the active lock, cooldowns, open work item, previous recommendations, and last complete weekly/monthly windows.
5. If another run is active and younger than 45 minutes, return `NO_ACTION`. If a lock is stale, record that fact before replacing only the lock metadata.
6. Set run metadata with a unique run ID, start time, trigger `30-minute-heartbeat`, and due stages. Do not erase existing state keys.

## 2. Determine what is due

The heartbeat runs every 30 minutes, but expensive work runs only when due:

- Every heartbeat: check lock health, failed validations, incomplete Flow image tasks, and human-review queue.
- Every 6 hours: scan configured communities and approved public forums for new problem clusters.
- Every 24 hours: collect search-performance snapshots. Search data must be read-only.
- Every 7 days: run the weekly comparison and choose one action lane.
- On the first eligible run after a calendar month closes: run the monthly comparison.

If no stage is due and no failed work needs attention, update heartbeat time and return `NO_ACTION`.

## 3. Collect search evidence

Use repository clients where they are valid; do not expose credentials in logs or reports.

### GSC

- Exclude the most recent three days from comparisons because data can be incomplete.
- Weekly: compare the last complete seven-day window with the preceding seven days.
- Monthly: compare the last complete calendar month with the preceding complete calendar month. When that is unavailable, use two non-overlapping 28-day windows and label them clearly.
- Collect query plus page, page, country, and device views. Include clicks, impressions, CTR, and average position.
- Identify: rising queries, declining pages, position 4-20 opportunities, high-impression/low-CTR pages, new queries without a strong landing page, and possible cannibalization where multiple pages answer the same intent.
- Use both absolute and percentage change. Do not elevate a percentage change when the absolute change is under 10 impressions or 2 clicks.

### Bing Webmaster Tools

- Collect query, URL, crawl/index, backlink, and rank/traffic data when the API provides it.
- Compare equivalent non-overlapping windows. Label unavailable metrics as unavailable; never convert missing data to zero.
- Do not submit URLs or sitemaps during this workflow.

Write raw normalized snapshots under `research/agents/reports/content-intelligence/data/` using dated, append-only filenames. Never overwrite a prior snapshot.

## 4. Scan Reddit and other forums

Use the configured Reddit sources plus public, relevant technical communities such as Microsoft Q&A, ElevenForum, vendor support forums, GitHub issues/discussions, Stack Overflow, Hacker News, and product communities. Stay within site terms and public access.

For every candidate problem, capture:

- exact audience wording and question;
- post/discussion URL, platform, publication date, engagement, and last activity;
- whether the issue appears in at least two independent discussions;
- affected product/version/error code/environment;
- whether a primary source confirms the behavior or fix;
- whether interest is rising, recurring, seasonal, or a one-off spike.

Reject copied posts, spam, affiliate threads, unsourced claims, inaccessible pages, and trend signals outside the approved pillars. Never quote more than necessary; summarize and link.

## 5. Map signals to the site

Build a coverage map from `src/content/articles/*.mdx` using slug, title, description, H1/H2 headings, category/pillar, publish/update dates, and internal links.

For each GSC/Bing/community candidate, classify it as:

- `EXACT_EXISTING_INTENT`: refresh the strongest existing URL;
- `PARTIAL_EXISTING_INTENT`: extend an existing article if the new section fits its promise;
- `CANNIBALIZATION_RISK`: consolidate the recommendation; do not create a new draft;
- `DISTINCT_GAP`: eligible for a new draft only after all new-topic gates pass;
- `NO_FIT`: reject.

Compare the strongest candidates with current top-ranking primary/authoritative pages and up to five genuine competitors. Record what they answer, what they miss, evidence quality, freshness, format, and information-gain opportunity. Do not copy their wording or outline.

## 6. Score and choose one lane

Score each candidate from 0-100:

- 25: verified GSC/Bing opportunity;
- 20: recurring community demand;
- 15: fit with an existing pillar and hub;
- 15: low cannibalization risk;
- 15: evidence-backed information gain the site can genuinely provide;
- 10: evergreen value.

Classify every finalist as evergreen, sustained trend, or timely/refreshable. Maintain the 60/25/15 portfolio over a rolling 20-article planning window. A strong opportunity may temporarily override the mix, but the report must explain why.

Require 65 to refresh and 75 to create a new draft. Break ties by confidence, then existing search traction. Record rejected finalists and reasons.

Choose exactly one weekly lane:

### Lane A: refresh existing content

Select one to three URLs whose changes answer measured queries. For each:

1. Preserve the URL and primary intent.
2. Make a backup-free, targeted patch in place; do not rewrite unrelated sections.
3. Improve the direct answer, missing troubleshooting steps, version details, evidence, title/description when CTR supports it, FAQs only when real questions warrant them, and contextual internal links.
4. Cite primary sources for technical claims and remove stale or unsupported claims.
5. Apply the human editorial standard. Do not invent first-hand experience.

### Lane B: create one new draft

Use this lane only if no existing page can satisfy the intent and all gates pass:

1. At least two independent community discussions and one primary source.
2. Distinct intent with no meaningful cannibalization.
3. Valid pillar/hub fit and at least three natural internal-link targets.
4. Clear information gain: original repository evidence, a reproducible test plan, verified commands, a decision framework, or a better synthesis of primary evidence.
5. Create one file in `drafts/` or use `draft: true`. Never place a live article in the production collection.
6. If genuine first-hand evidence is required but absent, create an evidence collection plan and stop at outline/draft status.

## 7. Image through Google Flow

For a new draft, or a refresh that truly needs a new hero, prepare and run a Google Flow image task using the workspace’s Minimal Flat Editorial formula. Use one physical subject and one visible anomaly. No text, UI labels, brand marks, gradients, extra objects, or photorealistic clutter.

Save the new optimized asset under `public/images/generated/` with a unique descriptive filename. Record the Flow prompt, generation time, dimensions, file size, and intended alt text. If Flow cannot complete autonomously, add the exact prompt to the human action queue; do not substitute an unrelated stock image.

## 8. Validate

Run the applicable checks without publishing:

1. `node research/agents/lib/quality-gates.mjs validate-all`
2. internal-link and duplicate-title checks already available in the repository
3. `npm run check`
4. `npm run build` only if it can be run without triggering publishing or deployment side effects; otherwise run `npx astro build` directly

Treat every build script as code before running it. The current `npm run build` begins with scheduled publishing, so use `npx astro build` for this workflow unless that script is made safe later.

If validation fails, keep all output in draft/review state and report exact failures. Do not auto-fix unrelated files.

## 9. Report and state update

Create an append-only Markdown report at:

`research/agents/reports/content-intelligence/YYYY-MM-DDTHH-mm-ssZ.md`

Include:

- status and selected lane;
- exact GSC/Bing comparison windows and data freshness;
- trend table with sources and confidence;
- article coverage/cannibalization map;
- competitor and primary-source findings;
- selected work, score, and why it beat alternatives;
- files created or edited;
- SEO, link, human-style, image, and build validation;
- claims needing human verification;
- human approval queue;
- next eligible run times.

Merge the completion record into `research/agents/state.json.contentIntelligence`, release the run lock, and preserve every unrelated key. End with one of the required status codes. Do not publish.
