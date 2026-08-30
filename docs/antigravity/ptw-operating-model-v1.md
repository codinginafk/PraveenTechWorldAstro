# PraveenTechWorld Operating Model v1.0

**Status:** Governance definition; Growth OS not yet activated  
**Depends on:** [Strategic Foundation v1.0](./ptw-strategic-foundation-v1.md) and [Phase-1 Product Architecture v1.0](./ptw-phase1-product-architecture-v1.md)  
**Last reviewed:** 2026-08-25

## 1. Purpose

This document defines how strategic decisions become governed work. It is the control layer between the Phase-1 product direction and the future Growth OS.

It answers:

- who decides;
- what agents may observe, recommend, or execute;
- what requires human approval;
- which data is trusted;
- how work is recorded and measured;
- how duplicate runs, stale evidence, and unsafe actions are stopped.

This document does not grant agents production access. Until a later Growth OS approval, production changes remain human-approved.

## 2. Operating principles

1. **Evidence before action.** Missing, stale, or contradictory evidence produces a wait or escalation state, not an invented conclusion.
2. **Problem Records before views.** New articles, tools, videos, and social assets must map to the Windows Troubleshooting Intelligence Graph.
3. **Safest useful step first.** Troubleshooting guidance exposes risk and rollback context.
4. **Exploit before expanding.** Eligible existing assets and validated problem clusters take priority over unproven new programmes.
5. **One decision, one owner, one record.** Every meaningful action has a decision ID, owner, evidence window, and next review date.
6. **No silent mutation.** Agents do not silently rewrite, delete, redirect, publish, spend, or change strategy.

## 3. Decision ownership

### Human owner / founder

Final authority for:

- strategic direction and battlefield changes;
- budgets, paid services, and external commitments;
- publishing or approving high-risk technical guidance;
- deletion, merging, redirects, canonical changes, and URL structure;
- public tools that execute commands or collect user data;
- community, email, social, and affiliate policy;
- activating, pausing, or changing Growth OS automation.

### Master Growth Agent (future)

Responsible for synthesizing evidence, ranking opportunities, maintaining the strategic boundary, delegating bounded analysis, and presenting decisions. It is not the final approver and does not bypass governance.

### Governance Controller (future)

Responsible for data freshness, article cooldowns, priority states, duplicate-run locks, evidence states, risk gates, approval requirements, and audit-log completeness.

### Specialized agents (future)

- **SEO Intelligence:** GSC/Bing/query/page analysis, indexability, internal-link opportunities, and competitor evidence.
- **Content Intelligence:** Problem Records, evidence mapping, briefs, updates, and content-quality checks.
- **Product/Tool:** Problem Record interfaces, internal search, and small-tool validation.
- **Distribution:** channel-specific, answer-first distribution proposals and measurement.
- **Analytics:** source-normalized metrics, experiment evaluation, and ownership signals.
- **Critic/Audit:** adversarial review of evidence, assumptions, safety, duplication, and stop conditions.

Specialized agents recommend or prepare bounded work. They do not change strategy or grant themselves permission to execute.

## 4. Action classes

### Read-only actions: permitted by default

- ingesting and normalizing GSC, Bing, analytics, repository, and report data;
- checking article metadata, links, indexability, and technical health;
- mapping queries and pages to existing Problem Records;
- identifying duplicate or overlapping opportunities;
- generating reports, scores, and proposed briefs;
- recording evidence, decisions, and outcomes.

### Proposal actions: no production mutation

- title, description, heading, internal-link, or section-change proposals;
- new article or Problem Record briefs;
- tool or diagnostic-flow proposals;
- distribution plans;
- competitor-gap analyses;
- experiments with hypothesis, baseline, expected result, cost, and stop condition.

### Human-approved production actions

- publishing or materially rewriting an article;
- changing title, description, canonical, schema, or internal-link structure on an indexed page;
- creating or changing redirects;
- merging or deleting Problem Records, articles, or URLs;
- deploying public tools, scripts, diagnostic paths, or feedback collection;
- posting externally or contacting communities;
- changing monetization, affiliate placement, or ad behavior.

### Forbidden without an explicit human decision

- destructive system commands or user-facing repair actions without the risk model;
- fabricated tests, outcomes, experience, citations, or user reports;
- buying links, manipulating platforms, spam distribution, or fake authority signals;
- collecting credentials, license keys, unnecessary personal data, or unredacted sensitive dumps;
- changing the Phase-1 battlefield because of one viral article, one keyword, or one trend;
- spawning duplicate watchers or parallel tasks for unchanged evidence.

## 5. Evidence and data contract

### Source trust order

1. First-party documentation and product advisories.
2. Reproducible local tests with recorded environments.
3. GSC, Bing, analytics, and repository data.
4. Reputable competitor and industry research.
5. Forums, Reddit, and social discussions as hypotheses or user-language signals.
6. AI suggestions as brainstorming only.

Lower-tier evidence cannot silently override higher-tier evidence. Conflicts are escalated or explicitly represented as uncertainty.

### Freshness rules

- GSC and Bing reports have a source-specific trusted-through date.
- The latest two to three days are treated as incomplete unless the source confirms full processing.
- Newer incomplete rows remain `PROVISIONAL` and cannot trigger content decisions.
- Article decisions require a complete measurement window after the relevant publication or update cooldown.
- Every snapshot records source, period, retrieval time, trusted-through date, completeness, and file/report provenance.

## 6. Article and Problem Record lifecycle

### Content classes and minimum review windows

- **Evergreen troubleshooting:** protect for 7 days; review at 7, 14, and 28 days.
- **News or breaking issue:** protect for 24–72 hours; review while verified interest is rising.
- **Windows/driver/update coverage:** protect for 3–5 days; review every 3–7 days while the version remains active.
- **Comparison or commercial guide:** protect for 7–14 days; review at 14 and 28 days.
- **Major rewrite:** protect for approximately 14 days after the change.

Technical, factual, security, or indexing emergencies may bypass a normal window, but the bypass must be logged with its reason and evidence.

### Eligibility states

```text
NEW_PROTECTED
  → MEASURING
  → ELIGIBLE
  → PROPOSED
  → CRITIC_REVIEW
  → APPROVED
  → EXECUTING
  → MEASURING_CHANGE
  → CLOSED / ROLLBACK / BLOCKED
```

An article updated within its cooldown is not eligible merely because clicks are low. A Problem Record with stale evidence becomes `REVIEW_REQUIRED`, not automatically rewritten.

## 7. Priority and queue rules

Problem Records and opportunities use:

- **P0 Critical:** security, data-loss, system-damage, or urgent verified user pain;
- **P1 High:** strong demand plus clear Phase-1 authority value;
- **P2 Medium:** useful but lower urgency, lower evidence, or lower demand;
- **P3 Experimental:** learning opportunity that cannot displace validated work.

Normal cycles may select no more than one to three meaningful content changes. Emergency safety or accuracy corrections are not limited by that normal quota.

No item enters the execution queue without:

- a canonical Problem Record or explicit new-record decision;
- source-normalized evidence;
- lifecycle eligibility;
- expected impact, cost, and owner;
- a critic review or documented reason it was unnecessary;
- a next measurement date and stop condition.

## 8. Operating cycle

1. **Ingest:** collect available reports and repository state.
2. **Normalize:** mark trusted-through dates, provisional rows, source tiers, and duplicates.
3. **Map:** connect pages and queries to canonical Problem Records.
4. **Prioritize:** apply P0–P3 and opportunity scoring.
5. **Critic:** challenge evidence, safety, duplication, resource cost, and expected value.
6. **Decide:** produce `HOLD`, `OBSERVE`, `OPTIMIZE`, `CREATE`, `DEPRECATE`, or `ESCALATE`.
7. **Approve:** obtain human approval for any production or external action.
8. **Execute:** perform only the approved bounded action.
9. **Measure:** wait for the appropriate window and compare against the recorded baseline.
10. **Learn:** close, continue, rollback, or stop; record the result.

## 9. Duplicate-run protection

Every run has an idempotency key:

```text
source + trusted_through_date + scope + strategy_version
```

The system must:

- permit one active run for a key;
- return the existing result when unchanged evidence is submitted again;
- avoid spawning a new conversation or task for every poll;
- cap retries and record failures;
- release locks on completion or explicit recovery;
- preserve the raw input and decision output.

A recurring schedule may refresh data, but it must not repeatedly create user-visible tasks for the same unchanged snapshot.

## 10. Audit ledger

The content-operations store should retain at least:

```text
decision_id
problem_id / article_slug
content_class
created_at
last_meaningful_update
cooldown_until
source_snapshot_ids
baseline_metrics
hypothesis
proposed_change
risk_class
approval_state
owner
executed_at
after_metrics
actual_outcome
next_review_date
stop_or_continue_decision
```

Raw source files remain preserved. A human-readable CSV export may be produced from the SQLite source of truth.

## 11. Escalation triggers

Escalate to the human owner when:

- evidence conflicts or is below the minimum threshold;
- a recommendation is high risk or irreversible;
- a new public tool would execute commands or collect data;
- a URL, redirect, canonical, or article deletion is involved;
- a proposed expansion falls outside Windows/PC troubleshooting;
- a monetization decision could compromise trust;
- the agent cannot determine whether a task is a new record or an existing one;
- the same experiment has failed or been repeated beyond its allowed limit.

## 12. Connected systems

The future operating layer may read from:

- `src/content/articles/` and article frontmatter;
- GSC and Bing exports;
- analytics and ownership-signal reports;
- official documentation and evidence reports;
- the Windows Troubleshooting Intelligence Graph;
- a dedicated `content_ops.sqlite` ledger;
- generated strategy and audit reports.

Existing research, mission-control, and scout databases remain separate concerns unless a later migration is explicitly approved. Social accounts, publishing credentials, and user-feedback systems are not implicitly connected.

## 13. Growth Cycle Report contract

Every completed Growth OS cycle must produce one structured report with this minimum shape:

```text
Growth Cycle Report
Period:
Run ID:
Strategy version:
Data sources:
Trusted-through dates:
Completeness:
Overall confidence:

Current situation:
Top opportunities:
  - Problem Record / article:
    Evidence:
    Expected impact:
    Cost:
    Risk:
    Confidence:
    Recommendation:
    Approval needed:

Blocked items:
Experiments running:
Decisions made:
Next review:
```

Free-form narrative may explain the report, but it cannot replace these fields.

## 14. Strategy-drift detection

The Critic must flag strategy drift when recommendations repeatedly:

- target topics outside the Windows/PC battlefield without an approved expansion gate;
- favor generic AI news, laptop reviews, or commodity software lists;
- propose tools or research programmes without validated demand;
- optimize for clicks while weakening safety, trust, or category authority;
- ignore the Problem Record, evidence, or lifecycle requirements.

Drift creates `ESCALATE`; it does not create a new workstream automatically.

## 15. Experiment budget

Until the owner changes the allocation using measured evidence, the monthly capacity guideline is:

- **70% exploitation:** improve eligible existing assets and validated clusters;
- **20% structured expansion:** create or enrich new high-priority Problem Records;
- **10% experiments:** test tools, diagnostic paths, distribution, or other bounded hypotheses.

This is a capacity budget, not a promise to spend money. P0 safety or accuracy work can override the normal allocation.

## 16. Confidence and rollback

Every recommendation includes a confidence label:

- **High:** multiple independent, current, high-trust evidence sources agree;
- **Medium:** useful evidence exists but coverage, freshness, or agreement is incomplete;
- **Low:** a hypothesis, small sample, or lower-tier source drives the idea.

Rollback or pause is required when a change causes a material ranking or traffic decline beyond the experiment threshold, increases factual or safety complaints, is contradicted by stronger evidence, or fails its stop condition after the complete evaluation window. The decision and reason are recorded; rollback is not interpreted as proof that the original hypothesis was worthless.

## 17. Operating boundary

This model defines governance. It does not activate a cron job, spawn agents, publish content, edit production pages, build a public tool, or authorize external communication. The next document may define Growth OS behavior only after this operating model is accepted and the content-operations ledger is available.
