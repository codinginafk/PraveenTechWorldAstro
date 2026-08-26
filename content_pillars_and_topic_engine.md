# Content pillars and topic engine

Status: operating source of truth for the content portfolio, aligned with the Phase-1 strategy on 2026-08-26.

The site is not trying to win by publishing unrelated articles. It is building a practical troubleshooting library that turns a real symptom into a safe next step, then connects that problem to related fixes, evidence, and tools.

## Pillar portfolio

### 1. Windows and PC troubleshooting — primary pillar

This is the Phase-1 authority wedge. It includes Windows updates, drivers, blue screens, graphics, audio, Bluetooth, WSL2, storage, recovery, and hardware diagnosis.

Required content shape:

- one symptom or error per page;
- direct answer in the opening;
- a decision path that separates likely causes;
- reversible checks before destructive actions;
- Microsoft, NVIDIA, hardware-vendor, or other primary sources;
- links to the parent hub and at least two related troubleshooting pages.

### 2. Local AI and agent workflows — secondary pillar

Keep this focused on real setups: local models, Ollama, GPU memory, agent context, routing, costs, and failure analysis. A page needs a concrete setup, measured result, reproducible command, or failure boundary. Generic AI news and feature summaries do not qualify as core coverage.

### 3. Web, search, and analytics operations — secondary pillar

Cover Search Console, Bing, sitemaps, indexing, analytics, technical SEO, and the site's own experiments. These pages should use screenshots, logs, configuration examples, or measured before-and-after results where available. Do not create separate pages for minor wording variations of the same indexing problem.

### 4. IT operations and security — selective support pillar

Publish only when the topic connects to Windows, small-team operations, account safety, incident response, or a real system failure. Security advice must distinguish detection, containment, recovery, and evidence preservation. Avoid unsupported guarantees.

### 5. Build-in-public and business experiments — evidence layer

Use this pillar for genuine case studies from the project: what was tried, what failed, what changed, and what the data showed. It supports trust and links into the practical guides; it is not a substitute for search-intent coverage.

## Current inventory

There are 138 article files. The current category mix is:

| Strategic pillar | Current articles | Diagnosis |
| --- | ---: | --- |
| Windows and PC troubleshooting | 28 | Underweight for the Phase-1 mission |
| Local AI and agent workflows | 47 | Overweight; keep quality high and slow net-new volume |
| Web, search, and analytics operations | 28 | Useful demand, but several overlapping pages need consolidation |
| IT operations and security | 20 | Keep selective and evidence-led |
| Build-in-public/business/other | 15 | Use for case studies or proven demand only |

The next 20 meaningful publishes or major refreshes should rebalance toward 12 Windows/PC pages, 4 focused AI/local-AI pages, 2 web/search pages, 1 IT/security page, and 1 measured experiment. This is a portfolio target, not permission to mass-produce pages.

## Topic selection rules

1. Refresh an existing URL when it already has impressions and ranks between positions 4 and 20.
2. Improve the title and opening before rewriting the whole page when CTR is below 3% in that range.
3. Create a new page only when the symptom, environment, diagnosis, or fix path is materially different from an existing URL.
4. Use Reddit and forums for the words people use and the failure patterns they report, not as proof of a fix.
5. Require a primary source and a clear information gain before publishing a changeable or risky topic.
6. Keep one canonical page for one intent and connect variants through sections, FAQs, and internal links.

## Quality gate

Every published or materially refreshed page must have a human search title, a factual description, a direct first answer, accurate commands, primary-source references, a relevant image with descriptive alt text, three useful internal links, and an explicit boundary for what the fix does not prove. Remove invented testing claims, fake percentages, guaranteed outcomes, and outdated Windows troubleshooting paths.

## Monthly operating mix

- 50%: improve existing pages with page-one impressions and weak CTR;
- 30%: hubs, internal links, and consolidation;
- 15%: evidence-backed trend or timely refresh;
- 5%: genuinely new experiments.

The target is qualified clicks and successful problem resolution, not a larger article counter.
