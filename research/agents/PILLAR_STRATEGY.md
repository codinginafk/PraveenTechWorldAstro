# PraveenTechWorld Content Strategy — AI-Leveraged Integrator

## Mission

Document how an IT Operations Lead uses AI (DeepSeek + OpenCode) to build automation scripts, data pipelines, and IT tools. This is a "build in public with AI" narrative — not a developer tutorial site.

## Pillars

| Pillar | Focus | Content Style |
|--------|-------|--------------|
| `ai-automation` | DevOps scripts, CLI tools, container migrations (Podman/Docker), system auditing using AI | Experiment + code + prompt |
| `it-operations` | Database auditing, active directory, enterprise infrastructure, security flows (M365/DEBULL) | Operations lead perspective |
| `tech-repair-diagnostics` | Evergreen PC repair, Android servicing, firmware fixes, using AI for local log & hardware diagnostics | Practical repair guides + AI tools |
| `website-setup` | GSC indexation, DNS, site diagnostics, sitemaps | Low-DA intercept topics |
| `build-in-public` | Battle logs, AI failures, local models caching setups, billing optimization | Honest, vulnerable diaries |

## Monthly Roadmap

### Phase 1: Foundation & Pivot (Jun-Aug 2026)
- **Month 1** ✅: 3 narrative articles published (DB audit, TLS cert, sysadmin toolkit)
- **Month 2** 🏃: Sprint active — targets 8 ai-automation, 4 it-operations, 3 build-in-public
- **Month 3**: E-commerce/AI bridge post

### Phase 2: Tool Belt Expansion (Sep-Nov 2026)
- **Month 4**: Financial data pipeline post
- **Month 5**: API/integration post (OpenRouter cost tracker)
- **Month 6**: Ops & Automation Playbook resource drop

### Phase 3: Authority Engine (Dec 2026-Feb 2027)
- **Month 7**: Tech landscape review from ops perspective
- **Month 8**: Community problem solving (Reddit/SO solutions)
- **Month 9**: Security & audit focus

### Phase 4: Monetization (Mar-May 2027)
- **Month 10**: Local AI setup for enterprises guide
- **Month 11**: Advanced ops architecture posts
- **Month 12**: Advisory services page launch

## Writing Rules (New Pillars)

1. Frame every article as a real experiment or battle log
2. Include the EXACT prompt you used to get the AI to write the code
3. Be honest about where the AI failed — this is the most engaging part
4. Show the code the AI generated, then show what you had to fix
5. Narrative structure: Problem → AI attempt → Where it broke → Fix → Working result → Prompt

## Distribution

- Dev.to (tags: AI, Python, automation, opensource) — auto-syndicate via syndication-agent.mjs
- Reddit r/sysadmin, r/automation, r/ITCareerQuestions
- LinkedIn (lead with vulnerability, not expertise) — auto-post via syndication-agent.mjs
- Hacker News (focus on AI failure stories)

## Tracking

- Google Search Console (daily via analytics-agent.mjs)
- Bing Webmaster Tools (daily via bing-client.mjs) — set BING_API_KEY in .env
- AI crawler tracking (GPTBot, ClaudeBot, PerplexityBot, Bingbot, etc.) via api/track.js + middleware.js
  - Deployed as Vercel Function + Edge Middleware
  - Data stored in Vercel Blob (set BLOB_READ_WRITE_TOKEN)
  - Report generated weekly by ai-crawler-agent.mjs

## Sprint Rules (Month 2 — AI Automation & Servicing Diagnostics)

1. Active pillars: ai-automation (primary), it-operations (secondary), tech-repair-diagnostics (tertiary)
2. Every new article must run through the `HUMANIZING` state pass to completely strip AI footprints.
3. Publish new humanized articles directly to the local Astro site weekly (unlimited cadence).
4. Syndicate to Dev.to strictly once per week as a private draft (published: false) to build high-quality backlinks without triggering spam shadowbans.
5. Generate LinkedIn and X thread post copies (no links in body copy for LinkedIn, thread format for X).
