# PraveenTechWorld — System Directive

## The Sole Truth

**`state.json` is the single source of truth.** Every agent reads from it before acting and writes to it after completing. No agent makes decisions based on its own memory or cache. If it's not in `state.json`, it didn't happen.

`state.json` lives at `research/agents/state.json` and tracks:
- Sprint progress (articles per pillar, day of sprint)
- Daily quotas and cooldowns (LinkedIn, Buffer, X, Blogger, Dev.to)
- Syndication records (what was posted where, when, with what URL, and API return status)
- GSC momentum data (regional metrics, specific keyword impression surges)
- Last run timestamps (research, GSC check, SEO audit, Screaming Frog parser, syndication)
- Topic memory (velocity of seen topics, pruned after 7 days if stale)

---

## Core Beliefs & Strategic Pillars

1. **Long-Tail Over Broad Volume:** Google rewards deep expertise on specific technical issues. A young domain cannot compete with high-authority hubs for generic terms. We build topical authority by dominating hyper-specific tech fixes and cutting-edge engineering issues — not generic "how-to" content.
2. **Research-Driven Action:** No article is written without validating Google Search Console (GSC) impression surges, scoring the topic via the 40/30/20/10 framework, and securing manual Boss approval. Topics scoring below 5/10 are rejected.
3. **Regional Traction (GCC First):** Leverage algorithmic momentum within regional markets (UAE, Oman). Target technical problems, setups, and enterprise environments specific to these corridors alongside global long-tail queries.
4. **Manual Gate Rule:** The orchestrator writes drafts and prepares assets but stops completely at Phase 5. No Git commits, Vercel deployments, or platform syndication actions happen without human verification.
5. **Genuine Content Only:** No false claims about having clients, business connections, or results not actually achieved. First-person single-voice: "I set this up on my local stack, here is how the performance looked."
6. **No Ad Budget:** Organic search + syndication + IndexNow only.
7. **Evergreen Over Trendy:** Articles about 2024/2025 are rejected. News, product launches, and AI drama are rejected. We build lasting assets, not ephemeral traffic.

### The Four Execution Pillars

Every generated topic must resolve to exactly one of these refined technical buckets. If a keyword is generic or high-competition, it must be rejected at the research phase.

| Pillar Slug | Core Technical Focus | Rejection Threshold Criteria |
|---|---|---|
| `windows-fixes` | Hyper-specific patch regressions, registry-level errors, device driver rollbacks, system utility troubleshooting, post-update recovery. | Reject broad terms covered by official Microsoft support roots or consumer tech portals (e.g., "how to update Windows"). |
| `website-setup` | Minimalist web architecture, sub-14KB networking optimizations, raw HTML/CSS/JS configurations, zero-JS patterns, migrations to lightweight static engines (Astro, Hugo). | Reject generic "how to code CSS" or boilerplate web design tips. Must focus on clean execution and extreme performance. |
| `hosting-infra` | Heavy data systems, relational database mechanics, handling massive local datasets (10M+ rows) across SQLite/MS Access, enterprise query optimization (complex outer joins, indexing strategies). | Reject abstract database theory. Must include concrete structural queries and real performance benchmarks. |
| `ai-websites` | Local LLM orchestration, physical VRAM boundaries (e.g., optimizing for an RTX 3060), hands-on API development across Claude, DeepSeek, OpenRouter, and practical agent pipelines. | Reject generic AI news, trend pieces, product announcements, or theoretical drama (e.g., "what is AI"). |

---

## Agent Pipeline Architecture

The agents form a strict sequential pipeline. Each phase depends on the previous.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (orchestrator.mjs)               │
│  Controls the cycle, checks GSC momentum, picks the cluster,    │
│  calls each agent in order, enforces quotas and lock file.      │
└──────┬──────────────────────────────────────────┬───────────────┘
       │ Phase 0-1                                │ Phase 4b-7
       ▼                                          ▼
┌──────────────┐  ┌───────────┐  ┌─────────────┐  ┌────────────────┐  ┌──────────────┐
│ Research     │→ │ SEO       │→ │ Boss        │→ │ Generate       │→ │ Syndication  │
│ Agent        │  │ Analysis  │  │ Agent       │  │ + Quality      │  │ Agent        │
│              │  │           │  │             │  │ Gates          │  │              │
│ Fetches      │  │ Scores    │  │ Filters via │  │                │  │ X / LinkedIn │
│ long-tail    │  │ topics    │  │ real 4-Q    │  │ Generates,     │  │ Dev.to /     │
│ trends,      │  │ using GSC │  │ rule +      │  │ links, runs    │  │ Blogger /    │
│ extracts GSC │  │ variables │  │ 40/30/20/10 │  │ Frog Parser,   │  │ Medium       │
│ local gaps   │  │ + CX data │  │ weighting   │  │ validates      │  │ (manual)     │
└──────────────┘  └───────────┘  └─────────────┘  └────────────────┘  └──────────────┘
                                                        │
                                                        ▼
                                                 ┌────────────────┐
                                                 │ Dev Agent      │
                                                 │ (auto-fixes,   │
                                                 │  deploy,       │
                                                 │  verify)       │
                                                 └────────────────┘
```

### Agent Roles

| Agent | File | Role |
|---|---|---|
| **Orchestrator** | `orchestrator.mjs` | Scheduler, lock manager, GSC morning check, cluster picker, daily quota enforcer, pipeline coordinator |
| **Research Agent** | `research-agent.mjs` | Fetches long-tail sources (RSS, Google Currents, CX), clusters headlines, identifies gaps in current sprint cluster, produces 20 scored topics |
| **SEO Analysis** | `seo-analysis.mjs` | Scores topics against GSC impression data + CX competition data, assigns pillar fit |
| **Boss Agent** | `boss-agent.mjs` | Applies 4-question filter, scores via 40/30/20/10, approves only ≥5/10, tracks pillar distribution |
| **Generate** | `generate.mjs` | Writes article MDX from approved topic + research context, injects 3+ contextual internal links, applies slug sanitization |
| **Quality Gates** | `lib/quality-gates.mjs` | Validates article against 30+ rules (C1-C14, T1-T12, L1-L4, M1-M10, Q1-Q4, P1-P2, S1) |
| **Agent Checker** | `lib/agent-checker.mjs` | Validates cross-agent data flow, state health, research output quality, syndication consistency |
| **Syndication Agent** | `syndication-agent.mjs` | Posts to Dev.to, LinkedIn, Buffer/X, Blogger; enforces staggered intervals, conditional state commits, queue isolation |
| **Dev Agent** | `dev-agent.mjs` | Applies LLM-generated code fixes, runs astro build, deploys to Vercel, verifies live URLs |
| **Marketing Agent** | `marketing-agent.mjs` | Social media daily posts, engagement monitoring |
| **Analytics Agent** | `analytics-agent.mjs` | Analytics data gathering, reporting |
| **Link Building Agent** | `link-building-agent.mjs` | Backlink outreach, DA monitoring |

### How They Interact

1. Orchestrator acquires file lock (`.orchestrator.lock`) — only one cycle runs at a time.
2. GSC morning check runs once per day to detect cluster momentum and regional impression surges.
3. Research Agent fetches long-tail topics only for the current sprint cluster.
4. SEO Analysis scores each topic against real GSC impressions + CX competition.
5. Boss Agent filters via 4 questions + 40/30/20/10 scoring; approves only ≥5/10.
6. Orchestrator picks highest-scored approved topic, calls Generate.
7. Generate writes article, converts markdown, applies slug sanitization regex, injects 3+ contextual internal links, passes through Quality Gates (must pass all).
8. Competitive check compares against source articles (must score ≥0.6).
9. **Manual approval gate** — orchestrator logs the file and waits; no commit/push/syndication.
10. After user approval, Syndication Agent posts to all platforms with staggered intervals, conditional state commits (only on HTTP 200), and queue isolation for failed channels.
11. Dev Agent builds, deploys, and verifies live URLs.
12. **All agents write results to state.json; all agents read state.json before acting.**

---

## The Sprint Model

Each sprint is 30 days focused on one primary cluster + one secondary cluster.

**Month 1 Sprint:** `website-setup` (primary, target 35) + `windows-fixes` (secondary, target 10)
**Publishing mix:** 70% primary / 20% secondary / 5% hosting-infra / 5% ai-websites
**Daily target:** 3 articles

The orchestrator picks the cluster each cycle based on:
1. GSC momentum (cluster with highest regional impressions gets priority)
2. Sprint targets (fill primary first, then secondary)
3. Cluster distribution (don't overload one pillar)

---

## Topic Scoring — 40/30/20/10 Framework

| Factor | Weight | Scoring |
|---|---|---|
| Already Getting GSC Impressions | 40% | 0-10 based on momentum.totalImpressions (regional surge gets bonus) |
| Supports Existing Cluster | 30% | 0-10 based on cluster size (more articles = higher) |
| Low Competition | 20% | 9 for hyper-specific technical problems, 6 for informational, 2 for listicles |
| Evergreen | 10% | 10 for non-year-specific, 8 for 2026/2027, 2 for 2024/2025 |

**Threshold:** Score < 5 → rejected. Score ≥ 5 → approved.

## Four-Question Filter (Pre-Generation)

Every article must pass all 4:

- **Q1:** Which cluster does this belong to? (If none → REJECT)
- **Q2:** Does it strengthen an existing cluster? (If no → REJECT)
- **Q3:** Can it link to at least 3 existing articles? (Checked at generation time; auto-scans local directories for valid anchors)
- **Q4:** Will people search this next year? (If year-specific 2024/2025 → REJECT)

---

## Quality Gates

Articles are validated against 30+ rules across 6 categories:

| Category | Gates | What They Check |
|---|---|---|
| **Content Quality** | C1-C14 | Readability (8-11 grade), word count (≥2000), description length (120-155), keyword placement, internal links (≥2), external citations (≥1), hook quality, sentence variety, active voice (≥80%), FAQ, paragraph length |
| **Technical SEO** | T1-T12 | seoTitle (40-60 chars), description, title tag (≤60 with suffix), coverImage, imageAlt (≥10 chars, format: `[Object] configuration showing [Action] for [Pillar]`), tags (3-4 specific technical tokens, no duplicates), heading hierarchy, broken internal links, socialHook (50-150 chars), publishDate, author, category |
| **Author & Links** | L1-L4 | Author link text, no generic link text, internal links target existing articles, external links use `target=_blank` + `rel=noopener` |
| **LLM Citation** | M1-M10 | Authority citations (.gov/.edu/official docs), original data, comprehensive depth, FAQ, neutral tone, step-by-step precision, TL;DR summary, freshness, query-answering H2s, syndication-ready hook |
| **Pillar Alignment** | P1-P2 | Category must be valid pillar, hub page must exist for pillar |
| **Problem Titles** | Q1-Q4 | Title must be problem-based, sprint cluster alignment, ≥3 internal links for cluster depth, no outdated years |

**Pass condition:** All gates pass → score 100/100. Each failure subtracts 5 points.

---

## Automated Technical SEO Guardrails

### Screaming Frog Parser Integration

The `seo-agent/screaming-frog.mjs` module must automatically parse the latest local crawler CSV exports in `seo-reports/` on every execution loop.

**Taxonomy Index Control:** If a tag archive (`/tag/`) or category archive (`/category/`) is detected in the index queue, the system must rewrite the target page template header to inject `<meta name="robots" content="noindex, follow">`. This prevents duplicate summary pages from stealing rankings from primary destination articles.

**Homepage Entity Mapping:** The homepage layout must maintain a permanent JSON-LD structured data block:

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Praveen Tech World",
  "url": "https://www.praveentechworld.com/",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.praveentechworld.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

---

## Syndication Rules

### Staggered Platform Posting Constraints

To protect account integrity and prevent platform anti-spam triggers, the syndication agent enforces strict time intervals and verifies return tokens before modifying state flags.

| Platform | Delivery Format | Min Cooldown | API & Validation |
|---|---|---|---|
| **X (Twitter)** | Max 280 chars, clean technical code snippet hook, 1-2 precise hashtags, image | 60 min | Buffer API (primary), fallback to Twitter API v2 |
| **LinkedIn** | Professional voice, system performance metrics, 3-4 specific hashtags, CTA link | 180 min | LinkedIn API v2 (w_member_social) — requires valid token verification |
| **Dev.to** | Code snippet first, modular technical breakdown, canonical URL hardcoded to root site | Instant (post-deploy) | Dev.to API — only trigger on successful Git build receipts |
| **Blogger** | Full rendered HTML, labels mapped to pillar categories, canonical note included | None | Blogger API v3 via OAuth 2.0 refresh token loop |
| **Medium** | Generate `.md` asset with manual publishing + canonical URL instructions | Manual | Static file output only |

### Conditional State Commit & Queue Isolation

- **Conditional State Commit:** An article can only be flagged as syndicated in `state.json` upon receiving a clean HTTP 200 OK response from the target endpoint.
- **Queue Isolation Protection:** If an external network timeout or API rate limit block is detected, the agent isolates that specific platform channel, preserves the copy payload inside the state queue, and schedules a retry for the next execution cycle without interrupting other publishing channels.

---

## Content Writing Rules

### Voice & Style
- **Banned AI Vocabulary:** The writing engine must not use: *delve, explore, tapestry, landscape, crucial, pivotal, testament, underscore, furthermore, in conclusion, additionally, showcasing, fostering, leveraging*.
- **First-Person Technical Voice:** Write from a single-person perspective: "I set this up on my local stack, here is how the performance looked." No false claims about clients, business connections, or unverified results.
- **Front-Loaded Value:** Place the direct technical fix, code snippet, or step-by-step solution within the first 100-150 words. No conversational preambles.
- **Vary Sentence Rhythm:** No 3+ consecutive sentences with the same structure or length.
- **Use Specific Data:** Include personal testing results, real benchmarks, exact command outputs.

### Structure
- Problem-based titles only: "[Specific Error] Not Working? [N] Fixes" or "How to Fix [Specific Problem]"
- H2 headings must answer specific user search queries
- FAQ section with real technical questions (LLMs extract these for featured snippets)
- Decision summary or TL;DR at end
- 1800-2500 words with exact step-by-step instructions

### URL & Metadata Rules
- **Flat Directory Schema:** All slugs resolve to `/blog/your-slug` with trailing slashes stripped. Deep date hierarchies (`/2026/01/`) and file extensions (`.html`) are banned.
- **Slug Sanitization:** The slug generator must run: `/[\u200b-\u200f\u2028-\u206f\ufeff]/g` to strip hidden Unicode spacing characters.
- **Image Alt Text Format:** `[Primary Technical Object] configuration showing [Action/State] for [Target Pillar Context]` — minimum 10 characters.
- **Hashtags:** Generate exactly 3-4 highly specific technical tokens (e.g., `#WebDev`, `#SystemsEngineering`, `#SQLite`). Never emit generic social tags.

### Interlinking Architecture
- **Automatic Scanning Loop:** The generation module must read existing markdown directories to find valid candidate anchors before writing.
- **Depth Rule:** Every new article must inject a minimum of 3 contextual internal links pointing to articles within its assigned topic cluster.

### What NOT to Write
- Off-strategy topics: android, iphone, samsung, resume, career, fashion, health, crypto, nft, playstation, xbox, tiktok, instagram, AI news/drama, product launches, apple, mac, linux
- Year-specific 2024/2025 articles
- Promotional language: revolutionary, game-changing, incredible, amazing, best, perfect, ultimate, secret, guaranteed

---

## Technical Infrastructure

| Component | Details |
|---|---|
| **Hosting** | Vercel (auto-deploys from main branch) |
| **Framework** | Astro + Tailwind (static site generation, 253 pages per build) |
| **Domain DNS** | Vercel DNS (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`) |
| **SSL** | Auto-provisioned by Vercel (Let's Encrypt / Google Trust CA) |
| **GSC Domain** | praveentechworld.com (verified via TXT record) |
| **GSC Property** | https://www.praveentechworld.com (URL prefix property) |
| **IndexNow** | Active — key file at `https://www.praveentechworld.com/b5ccb860-ee82-4baa-9416-61b965ff55d7.txt` |
| **Screaming Frog** | Local crawler for SEO audits (outputs CSV to `seo-reports/`) |
| **Google Cloud** | Project `opencode-project-498612`, service account for GSC + Blogger APIs |
| **Blogger** | Blog ID `5793911798769605489`, OAuth 2.0 with refresh token auth |
| **Syndication** | State-driven: `state.json` tracks all posts, quotas, cooldowns, API response codes |

---

## Error Recovery

### When an Agent Fails
1. Error is logged with timestamp and written to report.
2. The cycle continues to next phase (agents are independent; failure in one does not block others).
3. Failed syndication channels are isolated via queue isolation — retried on next cycle without blocking other channels.
4. If all topics fail Boss approval, cycle ends with no article generated.

### Stale Lock Recovery
- `.orchestrator.lock` staleness threshold: 30 minutes.
- Stale locks are removed automatically and a new lock is acquired.
- Lock prevents concurrent orchestrator cycles from running simultaneously.

---

## File Layout

```
.agents/
  SYSTEM_DIRECTIVE.md          ← This file — the constitution of the entire operation
  skills/humanizer/SKILL.md    ← Humanizer skill for post-writing AI pattern cleanup
research/agents/
  state.json                   ← SINGLE SOURCE OF TRUTH — all agents read/write here
  orchestrator.mjs             ← Pipeline controller, scheduler, lock manager
  boss-agent.mjs               ← Topic scoring via 40/30/20/10 + 4-question filter
  research-agent.mjs           ← Topic discovery from GSC, RSS, Currents, CX
  syndication-agent.mjs        ← Cross-platform posting with staggered intervals
  dev-agent.mjs                ← Code fixes, astro build, Vercel deploy, URL verification
  marketing-agent.mjs          ← Social media marketing, daily engagement
  analytics-agent.mjs          ← Analytics data gathering and reporting
  link-building-agent.mjs      ← Backlink outreach and domain authority scanning
  generate.mjs                 ← Article writer (MDX generation from approved topics)
  draft.mjs                    ← Draft generator for preview
  lib/
    syndication.mjs            ← Shared syndication helpers (devtoPost, bloggerPost, linkedinPost)
    syndicate-blogger.mjs      ← Blogger-specific OAuth refresh and publish
    syndicate-linkedin.mjs     ← LinkedIn-specific auth, image upload, post + rate limiter
    syndicate-twitter.mjs      ← Twitter/X via Buffer API (primary) + Twitter API v2 (fallback)
    syndicate-medium.mjs       ← Medium file generation for manual posting
    buffer-client.mjs          ← Buffer API client for X/Twitter scheduling
    quality-gates.mjs          ← 30+ rule validation engine (C1-C14, T1-T12, L1-L4, M1-M10)
    agent-checker.mjs          ← Cross-agent data flow validation, state health, article consistency
    shared.mjs                 ← Shared utilities (log, callLLM, fetch, .env loader, file helpers)
    report.mjs                 ← Report generation and appending
    cluster-gaps.mjs           ← Topic cluster gap analysis
    topic-scorer.mjs           ← Topic scoring utilities
    topic-memory.mjs           ← Topic velocity tracking and pruning
    topic-clustering.mjs       ← Headline clustering into topic groups
    sources.mjs                ← Source fetching (RSS feeds, Google Currents, CX API)
    linkedin-rate-limit.mjs    ← LinkedIn daily quota (3/day) and 3h cooldown enforcement
    linkedin-verifier.mjs      ← LinkedIn post quality verification
    linkedin-oauth.mjs         ← LinkedIn OAuth 2.0 authorization flow
    seo-scorer.mjs             ← SEO scoring heuristics
    imagesearch.mjs            ← Image search and selection
    llm-ranking.mjs            ← LLM ranking factors analysis
  seo-agent/
    gsc-client.mjs             ← Google Search Console API + IndexNow + sitemap submission
    screaming-frog.mjs         ← Screaming Frog CSV parser (reads seo-reports/ exports)
    sitemap-validator.mjs      ← Sitemap XML validation
    schema-validator.mjs       ← JSON-LD / schema.org markup validation
    link-analyzer.mjs          ← Internal/external link structure analysis
    image-auditor.mjs          ← Image optimization and alt text audit
    content-auditor.mjs        ← Content quality analysis
    reporter.mjs               ← SEO report generation
    config.mjs                 ← SEO agent configuration
    run.mjs                    ← SEO audit runner
  syndication/
    blogger-oauth.json         ← Blogger OAuth 2.0 credentials (client_id, client_secret, refresh_token, blog_id)
  seo-reports/                 ← Screaming Frog crawl exports (CSV: 4xx, 3xx, 5xx, alt text, titles, canonicals)
```
