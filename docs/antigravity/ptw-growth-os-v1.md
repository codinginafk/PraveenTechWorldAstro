# PraveenTechWorld Growth OS v1.0

**Status:** Design specification; not deployed  
**Depends on:** [Strategic Foundation v1.0](./ptw-strategic-foundation-v1.md), [Phase-1 Product Architecture v1.0](./ptw-phase1-product-architecture-v1.md), and [Operating Model v1.0](./ptw-operating-model-v1.md)  
**Last reviewed:** 2026-08-25

## 1. Purpose

The Growth OS turns complete, source-labelled evidence into a small number of governed growth decisions for the Windows Troubleshooting Intelligence Graph.

It is not a content generator, a general-purpose founder agent, or a perpetual task producer. Its job is to:

1. understand the current state;
2. identify the highest-value eligible opportunities;
3. challenge its own assumptions;
4. present bounded decisions for approval;
5. measure approved work;
6. learn without repeating failed or premature actions.

## 2. Non-negotiable invariants

- Phase-1 scope remains Windows + PC troubleshooting intelligence.
- Problem Records are the source unit; articles and tools are views or interfaces.
- Incomplete GSC/Bing days are provisional and cannot trigger normal content decisions.
- New and recently changed articles respect their content-class cooldown.
- No silent production mutation, external posting, spending, deletion, redirect, or strategy change.
- Every meaningful decision has evidence, confidence, owner, approval state, next review, and stop condition.
- One unchanged evidence snapshot produces one report, not a new task or conversation on every poll.

## 3. System responsibilities

### Master Growth OS

Owns the cycle. It reads the strategic foundation and operating rules, requests bounded analyses, reconciles results, and produces the Growth Cycle Report.

It may recommend `HOLD`, `OBSERVE`, `OPTIMIZE`, `CREATE`, `DEPRECATE`, or `ESCALATE`. It does not grant itself execution authority.

### Governance Controller

Enforces:

- strategy boundary and drift detection;
- source freshness and completeness;
- article and Problem Record eligibility;
- P0–P3 priority;
- experiment budget;
- duplicate-run lock and idempotency;
- required fields and approvals;
- risk and rollback gates.

### SEO Intelligence Agent

Analyzes GSC, Bing, indexing, page/query relationships, technical health, internal links, and competitor evidence. It reports evidence; it does not claim that rankings guarantee future traffic.

### Content Intelligence Agent

Maps demand to canonical Problem Records, identifies existing-page versus new-record decisions, proposes evidence-backed briefs, and checks content lifecycle and overlap.

### Problem Graph Agent

Maintains aliases, parent/child hierarchy, relationships, evidence states, freshness, and record completeness. It must flag duplicate or ambiguous records rather than silently merge them.

### Product/Tool Agent

Evaluates small interfaces such as internal search, Error Lookup, and diagnostic paths. It must present user value, implementation cost, safety, maintenance, and validation evidence before any build proposal.

### Distribution Agent

Proposes answer-first distribution for a specific asset and channel. It must respect community rules and must not treat every page as a promotion target.

### Analytics Agent

Normalizes metrics, records trusted-through dates, evaluates experiments after the correct window, and tracks acquisition, engagement, authority, trust, and ownership signals.

### Critic Agent

Attempts to falsify the current recommendation by checking evidence quality, stale data, cannibalization, strategy drift, safety, cost, user value, and likely failure modes.

## 4. Required inputs

Each cycle may consume:

- current Strategic Foundation, Product Architecture, and Operating Model versions;
- article inventory and frontmatter;
- Problem Record and evidence ledger;
- complete GSC and Bing snapshots plus provisional rows clearly marked;
- analytics and ownership-signal reports where available;
- repository and deployment history;
- official documentation and verified local tests;
- competitor and community observations as appropriately tiered evidence;
- open decisions, experiments, cooldowns, and previous outcomes.

Missing inputs are recorded as missing. The OS must not invent a value to satisfy a required field.

## 5. Growth cycle

### Phase A — Ingest

Load raw sources, create a run ID, calculate the idempotency key, and preserve source provenance.

### Phase B — Normalize

Mark source-specific trusted-through dates, provisional data, source tiers, date windows, duplicate rows, and conflicts.

### Phase C — Map

Connect queries, pages, articles, tools, and reports to canonical Problem Records. Flag records that need human resolution.

### Phase D — Prioritize

Apply P0–P3, opportunity scoring, content-class eligibility, experiment budget, and the 70/20/10 capacity guideline.

### Phase E — Critic review

For each candidate, ask:

- Is the evidence complete and current?
- Is an existing eligible asset already the correct target?
- Is this a duplicate, cannibalizing, or premature expansion?
- Is the expected user value greater than the cost and risk?
- Is the recommendation consistent with the Phase-1 battlefield?
- What would prove this recommendation wrong?

### Phase F — Decision

Return one of:

- `HOLD` — insufficient data or cooldown;
- `OBSERVE` — monitor without editing;
- `OPTIMIZE` — propose a bounded eligible change;
- `CREATE` — propose a new Problem Record or view;
- `DEPRECATE` — propose retirement or stale-evidence review;
- `ESCALATE` — requires human judgment before a decision.

### Phase G — Approval and execution

Production, public, destructive, high-risk, and external actions require the approvals defined in the Operating Model. The OS records the approval before an execution tool is called.

### Phase H — Measurement and learning

After the relevant evaluation window, compare against the recorded baseline, label the outcome, decide continue/rollback/stop, and preserve the result in the ledger.

## 6. Output contract

Every completed cycle emits one Growth Cycle Report:

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
  - Target:
    Problem Record:
    Evidence:
    Impact:
    Cost:
    Risk:
    Confidence:
    Recommendation:
    Approval needed:
    Next review:
    Stop condition:

Blocked items:
Experiments running:
Decisions made:
Strategy-drift flags:
Next cycle:
```

Narrative is allowed, but these fields are mandatory for machine-readable and human review.

## 7. Agent communication contract

Every specialist result must include:

```text
run_id
agent_name
agent_version
scope
source_snapshot_ids
trusted_through_dates
findings
evidence_refs
assumptions
confidence
recommended_decision
blocked_on
created_at
```

Agents must not pass unlabelled prose as an execution instruction. A finding, recommendation, approval, and execution result are separate message types.

## 8. Approval flow

```text
Evidence
  ↓
Specialist finding
  ↓
Master synthesis
  ↓
Critic challenge
  ↓
Governance validation
  ↓
Human approval when required
  ↓
Bounded execution
  ↓
Measurement
  ↓
Ledger outcome
```

Approval is specific to a decision ID and scope. Approval for one article or one experiment does not authorize unrelated work.

## 9. Failure handling

### Data failure

Mark the source incomplete or stale, keep the raw input, and return `HOLD` or `OBSERVE`.

### Agent disagreement

Preserve both findings, expose the evidence conflict, and return `ESCALATE` if it affects a production decision.

### Critic rejection

Return the candidate with objections and a resolution status. Do not silently resubmit it as a new opportunity.

### Execution failure

Stop retries at the configured limit, record the error, leave production unchanged where possible, and escalate if partial mutation occurred.

### Experiment failure

Measure after the complete window, then stop or rollback according to the recorded threshold. Do not immediately run a second unlogged variation.

### Strategy drift

Pause the affected workstream and flag the recommendation for human review. Drift does not create permission to expand scope.

## 10. Scheduling and cadence

- GSC/Bing growth decisions run after a complete source window is available, normally weekly.
- A lightweight data refresh may run more often, but unchanged snapshots must be idempotent and must not spawn duplicate tasks or conversations.
- News or security monitoring may be faster, but it produces evidence and alerts; it does not bypass approval or safety rules.
- No recurring 30-minute watcher is required for normal growth decisions.

## 11. Versioning and activation gates

The Growth OS may not be activated until:

1. the three foundation documents are accepted;
2. the content-operations ledger exists or an approved equivalent is ready;
3. source freshness and provenance are testable;
4. duplicate-run locking is tested;
5. approval and rollback paths are tested;
6. a dry-run cycle produces a valid Growth Cycle Report without production mutation;
7. the human owner explicitly authorizes activation.

Specialized prompts are created only after this design passes a dry run. Automation is the final layer, not the next shortcut.

## 12. Non-goals for v1

- autonomous publishing;
- autonomous article rewriting;
- AI chatbot or “AI PC doctor” platform;
- full community system;
- mass article generation;
- automatic social posting;
- automatic backlink outreach;
- large-scale database engineering;
- strategy changes based on one trend or one successful page.

