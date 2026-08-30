# PraveenTechWorld Phase-1 Product Architecture v1.0

**Status:** Architecture definition; no production implementation authorized  
**Depends on:** [Strategic Foundation v1.0](./ptw-strategic-foundation-v1.md)  
**Last reviewed:** 2026-08-25

## 1. Product thesis

PraveenTechWorld Phase 1 is not a collection of articles. It is a **Windows Troubleshooting Intelligence Graph** that helps users move from a symptom or error to a safe, evidence-backed next step.

The graph is the hero asset:

```text
Problem Record
      ├── Article view
      ├── Error lookup view
      ├── Diagnostic decision path
      ├── Script or utility (when justified)
      ├── Video explanation
      └── Moderated outcome feedback
```

No individual view is the product by itself.

## 2. Problem Record: atomic unit

Every material troubleshooting topic begins as a stable Problem Record. An article, tool, video, or social post must reference an existing record or explicitly create a new one.

### Required fields

```text
problem_id              Stable ID, for example PTW-WIN-NV-001
canonical_problem       Normalized problem name
aliases                 Error strings and common user phrasing
priority                P0, P1, P2, or P3 according to urgency and strategic value
category                BSOD, driver, update, audio, network, storage, etc.
symptoms                Observable user symptoms
environment             Windows version, hardware, driver, app, and relevant conditions
possible_causes         Ranked hypotheses, not asserted facts by default
diagnostic_questions    Questions that separate likely causes
fixes                   Ordered actions with prerequisites and risk class
evidence_refs           Links to evidence records
affected_versions       Known Windows, driver, hardware, or app versions
outcomes                Verified, reported, failed, or unknown outcomes
related_records         Graph relationships to adjacent problems
status                  Lifecycle state
last_verified_at        Freshness marker
owner                   Responsible human or agent role
```

### Priority states

- **P0 Critical:** high user pain with possible data loss, security impact, system damage, or urgent verified demand.
- **P1 High:** strong demand and clear authority value for the Phase-1 battlefield.
- **P2 Medium:** useful problem with lower urgency, lower demand, or incomplete evidence.
- **P3 Experimental:** a hypothesis or learning opportunity that must not displace validated work.

Priority is recalculated from evidence and impact; it is not a permanent label.

## 3. Graph relationships

The first schema should support at least these relationships:

- `problem HAS_SYMPTOM symptom`
- `problem HAS_ALIAS error_string`
- `problem MAY_BE_CAUSED_BY cause`
- `problem AFFECTS environment`
- `problem DIAGNOSED_BY question_or_check`
- `problem HAS_FIX fix`
- `fix REQUIRES prerequisite`
- `fix HAS_RISK risk_class`
- `fix SUPPORTED_BY evidence`
- `problem RELATED_TO problem`
- `view REPRESENTS problem`
- `outcome REPORTS_ON fix`

Relationships must preserve uncertainty. “May be caused by” is not the same as “caused by.”

## 3A. Canonical problem hierarchy

The graph must distinguish a broad parent problem from a specific child problem. For example:

```text
Parent: Windows Update Failure
  ├── Child: Error 0x8024200D
  ├── Child: KB installation rollback loop
  └── Child: Update stuck at 0 percent
```

Aliases and near-duplicates point to one canonical record. A new record is created only when the symptoms, environment, diagnosis, or fix path materially differs. This prevents duplicate records, overlapping articles, and competing diagnostic paths.

## 4. Evidence model

Evidence is stored independently from prose so that articles and tools can be refreshed without losing provenance.

### Evidence states

- `proposed` — a hypothesis or candidate fix;
- `source-verified` — supported by an authoritative or directly relevant source;
- `locally-tested` — reproduced or tested by the project with a recorded environment;
- `community-reported` — reported by a user or public discussion, pending verification;
- `failed` — tested or reported unsuccessful under a defined environment;
- `stale` — no longer reliable for the affected version or environment.

### Evidence record fields

```text
evidence_id
problem_id
source_type
source_url
retrieved_at
environment
claim_or_observation
verification_method
confidence
last_reviewed_at
```

The system must never convert a proposed fix, community report, or planned test into a claim of first-hand testing.

### Evidence decay

Evidence carries a freshness state in addition to confidence:

- **Fresh:** verified or retrieved within the last six months;
- **Aging:** six to eighteen months old and requiring review when the affected version changes;
- **Stale:** older than eighteen months or contradicted by current documentation;
- **Accelerated review:** security, driver, firmware, or fast-moving release evidence reviewed sooner than the default windows.

Age alone does not invalidate evidence, but stale evidence cannot silently remain the basis for a current fix.

## 5. Risk model

Every fix exposed to users carries a risk class:

- **Low:** reversible, non-destructive checks and ordinary settings changes.
- **Medium:** backup/restore point recommended; driver, service, or configuration changes may be involved.
- **High:** registry, BIOS/firmware, boot, storage, destructive reset, security-sensitive, or hardware intervention.

High-risk steps require stronger evidence, explicit warnings, prerequisites, rollback guidance, and a clear stop condition. The architecture does not permit a generic “try these fixes” list to hide risk differences.

## 6. Views and interfaces

### Article view

Explains the problem in plain language, presents the safest path first, exposes evidence and version scope, and links to deeper diagnostics only when needed.

### Error lookup view

Maps an error string or symptom to relevant Problem Records, aliases, likely causes, and the first diagnostic question. It must avoid pretending that an error string alone proves a root cause.

### Diagnostic decision path

Asks a small number of discriminating questions, then routes the user to a ranked next step. It should collect only the minimum information necessary for the path.

### Script or utility view

Only exists when a repeated, validated task is safer or clearer as a utility. Utilities require input validation, safe defaults, documentation, rollback or dry-run behavior where applicable, and maintenance ownership.

### Video and distribution views

Derive from the same Problem Record and evidence state. A video or social post cannot introduce unsupported claims that the underlying record does not contain.

## 7A. User journey

The intended product journey is:

```text
Search, referral, or direct entry
        ↓
Problem or symptom page
        ↓
Diagnosis and risk-aware next step
        ↓
Fix attempt or linked tool
        ↓
Outcome feedback where available
        ↓
Related problem or prevention path
        ↓
Return visit, saved resource, or owned channel
```

Each stage should have a measurable event where technically practical. A pageview without progress toward diagnosis is not a successful product session.

## 7. Feedback model

User feedback can improve prioritization and reveal environment-specific outcomes, but it is not automatically editorial truth.

### Minimum feedback fields

```text
problem_id or error_text
Windows version
relevant hardware/app context
attempted fix
reported outcome
optional diagnostic details
consent and moderation state
```

Do not collect unnecessary personal data, license keys, crash dumps containing sensitive information, or credentials. Feedback must support redaction, abuse handling, deletion, and separation between public reports and internal evidence.

## 8. Lifecycle

```text
DISCOVERED
  → STRUCTURED
  → RESEARCHED
  → VERIFIED (or explicitly marked uncertain)
  → PUBLISHED_VIEW
  → MEASURED
  → MAINTAINED / DEPRECATED
```

An article may be published before every hypothesis is verified, but its uncertainty and evidence state must be visible internally and reflected in the wording. A record becomes `DEPRECATED` when its versions, fixes, or assumptions are no longer reliable.

## 9. Phase-1 build sequence

1. Define the record and evidence schema.
2. Seed a small set of high-value Windows/PC records from existing site demand.
3. Connect records to current articles without rewriting newly published content.
4. Improve internal search and measure failed searches and successful article navigation.
5. Validate a narrow Error Lookup interface.
6. Add decision paths only for problems with repeated demand and enough evidence.
7. Add moderated feedback after the read-only system is useful.

This sequence is intentionally smaller than building a full community or “AI PC doctor.”

## 10. Success signals

The Phase-1 North Star Metric is **successful problem-resolution sessions**: a user reaches a relevant Problem Record, completes a useful diagnostic or repair action, and either confirms progress or reaches an appropriate next step.

Supporting metrics are grouped by purpose:

- **Acquisition:** impressions, clicks, ranking coverage;
- **Engagement:** diagnostic progression, tool usage, useful article navigation, failed searches;
- **Authority:** relevant backlinks, mentions, and verified external references;
- **Trust:** evidence freshness, verified outcomes, corrections, and safety incidents;
- **Ownership:** returning visits, direct visits, saved resources, subscribers, or repeat tool usage.

Product signals include:

- users finding a relevant article after an error lookup;
- reduced failed internal searches;
- repeated use of diagnostic paths;
- verified outcomes attached to Problem Records;
- returning visits to the lookup or diagnostic interface;
- relevant external references or links;
- improved performance of the associated search cluster.

Raw record count is not a success metric by itself.

## 10A. AI boundary

AI is infrastructure in Phase 1, not the customer-facing identity. It may assist with research, classification, summarization, deduplication, and diagnostic hypothesis generation. AI-generated claims remain unverified until supported by the evidence model, and AI branding must not displace the Windows troubleshooting promise.

## 11. Architecture boundary

This document defines the product and knowledge model. It does not authorize:

- autonomous publishing or article rewrites;
- destructive commands or system changes;
- collection of personal data without a privacy design;
- creation of a large tool or community platform;
- Growth OS scheduling, delegation, or spending.

Those decisions belong to a later governance and execution layer.
