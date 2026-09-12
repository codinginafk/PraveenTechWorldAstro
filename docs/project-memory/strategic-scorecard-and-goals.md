# PraveenTechWorld Strategic Scorecard & Multi-Horizon Goal Architecture
**Status**: Active · Tracked in SQLite & PTW Control Center (`http://127.0.0.1:8787/#goals`)
**Last Updated**: 2026-09-12

---

## 1. Goal Horizons Overview

```
[Yearly: 2026–2027 Benchmark] ────────────────────────── [Progress: 8.0%]
 └── [3-Month / Q4 2026 Scaling] ──────────────────────── [Progress: 32.5%]
      └── [Monthly: 30-Day Targets] ───────────────────── [Progress: 55.0%]
           └── [Weekly: 2026-W37 Sprint] ──────────────── [Progress: 83.3%]
                └── [Daily / 3-Day Sprint] ────────────── [Progress: 100.0%]
```

---

## 2. The 10-Point Strategic Scorecard

| # | Horizon | Strategic Objective | Category | Where It Is Now (Baseline) | Where We Are Going (Target) | Progress | Status | Next Milestone |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: | :-: | :--- |
| **1** | **Daily / 3-Day** | Screaming Frog 0-Defect Crawler Integrity | SEO | 0 4xx client errors, 0 trailing slash loops, 24 H2 headings tightened < 60 chars, strict H1->H2 hierarchy restored. *(Baseline: 24 warnings)* | Maintain continuous 100% crawl cleanliness with zero fatal/critical crawl warnings on weekly automated crawls. | **100%** | `Completed` | Automated weekly regression check |
| **2** | **Daily / 3-Day** | Interactive High-Intent Developer Tools & Telemetry | Acquisition | Launched Business Password Manager Pricing & TCO Calculator at `/tools/password-manager-pricing-calculator` with custom Clarity & GTM event tracking. *(Baseline: 3 tools)* | Capture striking-distance traffic from 2,000+ impression password queries and convert passive readers into tool users with 10%+ interaction rate. | **100%** | `Completed` | Monitor tool interactions and clipboard copies in Clarity |
| **3** | **Weekly (W37)** | Google AdSense Domain Approval & ads.txt Verification | Monetization | ads.txt deployed with `pub-7141944151842257`, tested 200 OK across apex and www for Google-adstxt crawler; site is in Google "Getting ready" review queue. | Full AdSense domain verification approved, ads.txt status showing green "Authorized", and zero-CLS auto-ad units live. | **80%** | `In-Progress` | AdSense review queue clearance (48h to 2 weeks) |
| **4** | **Weekly (W37)** | Windows 11 25H2 Upgrade & Servicing Runbook Release | Content | Article drafted in `src/content/articles/`, Minimal Flat Editorial cover illustration created, awaiting October 13 24H2 End-of-Support release timing. | Publish definitive troubleshooting runbook for Windows 11 25H2 upgrade errors (KB5124008) targeting high-urgency upgrade queries. | **70%** | `In-Progress` | Final content linting and live release via PTW-0305 |
| **5** | **Weekly (W37)** | Heatmap & User Journey Telemetry via Clarity & GTM | Measurement | Microsoft Clarity project `yf20xj4sle` live on 100% of pages capturing click heatmaps, scroll depth, rage clicks, and session recordings, linked with GTM `GTM-N2N2QBJC`. | Audit user drop-off points, eliminate dead clicks, and verify reader navigation flow from technical guides to interactive tools. | **100%** | `Completed` | Review weekly session recordings for reading pause patterns |
| **6** | **Monthly (30D)** | Striking-Distance CTR Recovery & Query Intent Optimization | SEO | Top 10 high-impression queries identified (4,722 imp on virus reset, 1,697 imp on KB5121003, 1,402 imp on volume control); reinstall cannibalization cluster merged. *(Baseline: 0.5% CTR)* | Lift average organic CTR across top 10 striking distance articles from ~0.5% to >= 3.0%, generating an additional 350+ monthly organic clicks. *(Target: 3.0% CTR)* | **45%** | `In-Progress` | Track 30-day SERP position and CTR response in Google Search Console |
| **7** | **Monthly (30D)** | Autonomous Workbench Engine & Quality Gate Governance | Infrastructure | 2-hour actionable cron armed (`task-32102`); watchdog daemon running; PTW Doctor 12/12 passing green; strict single-post publish guardrail in place. *(Baseline: 1 post/wk)* | Maintain consistent release cadence of 3–4 high-quality workbench-tested technical guides per week, each with custom schema, 60-word bold lead answers, and hero art. | **65%** | `In-Progress` | Sustained weekly publishing without doctor or build discrepancies |
| **8** | **3-Month (Q4)** | Organic Search Scaling & Google Top 5 Footprint | Acquisition | ~180 monthly organic clicks and ~12,000 monthly search impressions across 130 indexed articles with average ranking position ~35. *(Baseline: 180 clicks/mo)* | Reach 2,500 monthly organic clicks and 50,000 monthly impressions, with at least 15 articles ranking in Google Top 5 for high-intent technical troubleshooting terms. | **15%** | `In-Progress` | Cross 500 monthly clicks by mid-Q4 2026 |
| **9** | **3-Month (Q4)** | Interactive Developer Tools Suite Expansion (8 Web Utilities) | Acquisition | 4 functional client-side interactive tools live (VRAM Calculator, WSL Config Generator, Windows Error Fixer, Password Manager Pricing Calculator). *(Baseline: 1 tool)* | Expand to 8 production-grade web tools (adding Docker Resource Allocator, Subnet CIDR Calculator, SSL Cert Inspection Generator, and Regex Explainer) to generate passive backlinks. | **50%** | `In-Progress` | Build and deploy Tool #5 (Docker Resource Allocator) |
| **10** | **Yearly (Annual)** | Authority Media Platform & Sustainable Monetization Benchmark | Monetization | Domain age 3.5 months, ~180 clicks/mo, pre-revenue, building foundational content library and technical credibility. | Establish PraveenTechWorld as a recognized first-person IT engineering authority reaching 10,000+ monthly clicks, 100,000+ monthly impressions, and $500+/mo in recurring revenue. | **8%** | `In-Progress` | Achieve first $100 AdSense revenue month & 1,000 monthly clicks |
