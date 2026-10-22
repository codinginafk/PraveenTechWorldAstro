# Workspace Safety & Permissions Settings

The following permissions are active for the workspace environment:
```json
{
  "permissions": {
    "fs": "allow",
    "net": "allow",
    "process": "allow",
    "shell": "allow",
    "browser": "allow",
    "env": "allow",
    "python": "allow",
    "node": "allow",
    "exec": "allow",
    "agents": "allow",
    "skills": "allow",
    "tools": "allow",
    "memory": "allow",
    "workspace": "allow"
  },
  "autoApprove": true,
  "suppressPrompts": true
}
```

## Durable project memory

Before starting work, read `docs/project-memory/current.json`. At the end of a completed or paused task, record a short handoff with `node scripts/project-memory.mjs handoff ...`. Use `research/agents/state.json` for content-pipeline state and Git for code/content history; project memory records the cross-harness summary, next action, files, and verification so a different model or harness can resume safely.

## Safety Constraints (CRITICAL OVERRIDES)
Regardless of the `autoApprove` and `suppressPrompts` configurations above, the following constraints must be strictly adhered to:
1. **No Silent Deletions or Replacements:** You are strictly prohibited from deleting any file, or replacing/overwriting any file, without asking the user for explicit permission first.
2. **No Unapproved System-Level Operations:** You are strictly prohibited from executing system-level configuration changes, registry modifications, operating system updates, or malware/virus checks against Windows without asking the user for explicit permission first.

## Brand Voice & Perspective Rules
1. **First-Person Team Perspective:** Always write articles and marketing copy from the first-person perspective of "our team," "my friends and I," or "we" sharing real, firsthand developer-ops experiences, workbench troubleshooting, or test results.
2. **Helpful Content E-E-A-T:** Avoid dry, textbook style third-person write-ups. Ground technical fixes (like Docker permissions or bad RAM diagnostics) as actual problems we faced on our own dev machines or infrastructure, and how we resolved them together.

## Content Release Safety Guards (STRICT SINGLE-POST LIMIT)
1. **Never Publish Multiple Articles Simultaneously:** You are strictly prohibited from publishing or releasing more than **one single article file** to the production sitemap or live build folder in any single session. 
2. **Draft Queue Enforcements:** If multiple topics are requested or ready, only compile **one** as live (`draft: false` or active). All other files must be written to a local `drafts/` directory or explicitly marked as `draft: true` in their frontmatter to keep them out of the build.
3. **Commit Segregation:** Each published article must be committed and pushed in its own isolated commit on separate days/sessions. Never bundle multiple new articles into a single release or git push.

## User-Triggered Orchestration Rules
1. **Orchestration Prompting:** Whenever the user asks to generate or work on an article or social posts, you must explicitly ask if they want to run the orchestration pipeline for this job.
2. **Modified/Targeted Orchestration:** If orchestration is selected, execute the pipeline components (Research brief -> SEO scrape -> Boss approval scoring -> MDX generation -> Quality gates -> Cover image creation -> Social post files) targeted specifically at the user's requested topic, rather than running the automated/randomized trend loop.

## Content Visual & Cover Image Rules (Hero Image Prompt System)
1. **Style Lane (Minimal Flat Editorial):** Every article hero image must follow the Minimal Flat Editorial style — flat editorial illustration, single centered subject on a plain off-white background, thin precise linework, three-color palette (off-white / charcoal / one alert accent color, e.g., amber or crimson), soft even lighting, generous negative space, no other objects.
2. **Variable Formula:** Every prompt consists of:
   - `[SUBJECT]` — one physical object or metaphor representing the article's core concept.
   - `[STATE]` — what's subtly wrong, hidden, or altered about it (e.g. ghost outline line of text, altered gauge bar).
3. **Strict Simplicity & Clarity:** One object, one anomaly. Reads cleanly at thumbnail size.
4. **No Text Overlay:** Banish text titles in cover graphics. Let Astro HTML handles card text overlays.

## The Readability Standard (How We Write Going Forward)
1. **Sentence Length Target:** Keep average sentence length between 11 and 15 words. Never write a sentence longer than 25 words without breaking it with a period.
2. **First-Person Workbench Experience:** Ground every technical guide in real developer work: "We tested this on Windows 11 24H2", "The script crashed on line 42 because Pandas read empty cells as strings".
3. **Cut the Buzzwords:** Eliminate synergy, paradigm, transformative, testament, landscape, multifaceted, leverage, utilize.
4. **Immediate Direct Answer:** Put the exact PowerShell/Python command or 2-sentence fix in the first 50 words before getting into the architecture.

## Keyword Research & Impression-to-Click Conversion Rules
1. **Desktop Tool Suite Integration:** Always interface with the specialized tool suite at `C:\Users\bunny\OneDrive\Desktop\KeywordResearch\app.py` and `scripts/serp_keyword_optimizer.py`. Use `app.score_title()` to score candidate titles (target score >= 70/100) and `app.find_flow()` to extract real autocomplete user questions for H2 subtitles.
2. **Strict Title Protection Gate (Never Break Winners):**
   - **PROTECT (Keep 100% Intact):** Never modify the `<title>` or `seoTitle` of articles with GSC CTR > 5.0%, Clicks > 100, or Position <= 2.5 (e.g. `DeGoogle Starter Pack` at 29% CTR).
   - **SURGICAL REFINEMENT:** For healthy articles with CTR 1.0%–3.0%, retain the exact winning frontload keyword string; only append odd-number counts or freshness anchors.
   - **UPGRADE:** Rewrite only underperforming titles with CTR < 0.8% in striking distance (positions 4–10) or truncated titles.
3. **Passage Citability Capsules:** Embed a 134–167 word standalone answer block directly under the primary problem H2 with firsthand workbench test details for Google AI Overview (GEO/AEO) extraction.
4. **Metadata & Freshness Propagation:** Ensure titles are between 45–60 characters (never truncated), descriptions are under 155 characters, and `updatedDate` is set to activate the emerald freshness badge and SERP modified timestamps.

## Core Topical Purity & Strategic Priority Rules (Mandatory Focus Lanes)
1. **The Three Core Priority Lanes (Cover These and These Only):**
   - **Lane 1: DeGoogle, Digital Sovereignty & Privacy Infrastructure:** (Our #1 global search moat: GrapheneOS, local self-hosted backups, Proton/Tuta migrations, Nextcloud, alternative private search engines, DNS/telemetry blocking, privacy runbooks).
   - **Lane 2: Hard Windows Kernel, Hardware, & Driver Diagnostics:** (Where Google gives us Page 1 authority: BSOD stop codes, WinDbg dump triage, DISM/WinSxS component store repairs, GPU TDR crashes, RAM controller stability, and WSL2 kernel memory limits).
   - **Lane 3: Self-Hosted & Local AI DevOps Runbooks:** (Concrete, reproducible workbench benchmarks: Ollama, DeepSeek local deployment, VRAM calculators, local RAG on physical GPU hardware, and self-hosted AI automation).
2. **Strict Topical Purity Gate (Banned Dilution Topics):**
   - You are strictly prohibited from writing, researching, or generating content outside of these three core lanes.
   - Specifically banned: generic AI news summaries, speculative AI predictions ("AI in 10 years", "Will AI take jobs"), generic office productivity/email tips, student grade report scripts, or generic social media marketing guides. These dilute site topical authority and get rejected by Google into "Crawled - currently not indexed".
3. **Double Down on News & Cluster Depth Around Our Winners:**
   - Any new research, news analysis, or article drafting must directly strengthen one of the three core lanes or act as a high-authority satellite expanding off our #1 ranking winners (e.g., expanding our `degoogle-starter-pack` fortress cluster).
   - Every piece within these lanes must be interlinked directly to the primary cluster pillar, using only active canonical URLs (never link to redirected or deprecated slugs).
