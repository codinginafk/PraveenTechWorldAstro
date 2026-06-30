# 🎛️ PraveenTechWorld Content Operations Dashboard

Welcome to your central Content Ops Vault! This Obsidian space is inter-linked with your automatic orchestrator pipeline to track research, drafts, sitemap indexes, and social syndications.

---

## 📈 Active Pipeline Overview

- **Daily Article Quota:** 3 Posts / Day
- **Latest Live Build:** [Astro Local Preview](http://localhost:3000)
- **Active Sprint Categories:** 
  - `[[vault/Topics/ai-automation-scripts]]`
  - `[[vault/Topics/windows-fixes]]`
  - `[[vault/Topics/technical-seo]]`

---

## 📂 Vault Directories

- 💡 **[[vault/Topics/|Research & Topics]]:** Keywords, SEO metrics, and AI topic briefs.
- ✍️ **[[vault/Drafts/|Active MDX Drafts]]:** Generated articles waiting for user verification before publishing.
- 🚀 **[[vault/Published/|Published Articles]]:** Archive of live pages and their syndication links.
- 🔗 **[[vault/Social-Hooks/|Social Media Hooks]]:** Draft hooks for LinkedIn, Buffer, and X/Twitter.

---

## 🤖 Orchestration Control Panel

To interact with the marketing orchestrator daemon directly from your command line:

- **Run Single Generation Cycle:** 
  `node research/agents/orchestrator.mjs once`
- **Run Live Screaming Frog SEO Audit:** 
  `run-audit.bat`
- **Re-Index Pagefind Search Database:** 
  `npm run build`
