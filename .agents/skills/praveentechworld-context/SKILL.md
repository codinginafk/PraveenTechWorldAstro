---
name: praveentechworld-context
description: "Context memory and history for the PraveenTechWorld technology blog. Trigger when editing layouts, styling components, running search improvements, or building content automation engines."
---

# PraveenTechWorld Context & Project Memory

This workspace customization contains the memory and execution history of previous engineering sprints on PraveenTechWorld.

## Project Profile
- **Tech Stack:** Astro, Tailwind CSS (v4), Markdown/MDX, Node.js.
- **Content Storage:** `src/content/articles/` (.mdx files) synced automatically to local Obsidian vault (`research/vault/Published/`).

## Key Implementations (Sprint Archive)
1. **Performance & CSS Inlining:**
   - Script: `research/agents/lib/inline-css.mjs`.
   - Action: Post-build script that runs after `astro build` to inline the compiled CSS file directly into the `<head>` of all HTML files.
   - Result: Render-blocking style request eliminated completely (LCP impact).
2. **Local Font Hosting (No 404s):**
   - Script: `research/agents/lib/copy-fonts.mjs` (copies Latin woff2 font files from `@fontsource`).
   - Action: Absolute `@font-face` urls configured in `global.css` starting with `/fonts/`.
   - Result: Google Font CLS and external preconnects removed.
3. **Viewport-Aware LCP:**
   - Component: `ArticleCard.astro`. Eager-loads images for indexes `< 3` (eager/high priority) to align with desktop grid viewports.
4. **Search Page Improvements:**
   - File: `src/pages/search.astro`.
   - Action: Embedded global style overrides for Pagefind UI elements to support high-contrast light and dark mode colors.
   - WebMCP: Dynamic script tag decoration applies `webmcp-action="search_articles"` and `webmcp-parameter="query"` on Pagefind UI inputs for AI crawling bots.

## Proposed Next Steps: Content Automation Engines
*Detailed architecture documentation is stored inside the Obsidian vault.*
- **Evidence Engine (EE):** Gathers logs, benchmarks, and screenshots before writing.
- **Knowledge Graph (KG):** Parsed local Obsidian link mapping database to guide article drafting.
- **Learning Engine (LE):** Weekly performance metric evaluator to dynamically adjust the writing scope.

---

## Archival Data
- **Full Conversation Log:** [2026-07-04.md](file:///C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/research/2026-07-04.md) - contains the exact transcripts of the styling, performance, GTM, search page, and WebMCP development sprints.
