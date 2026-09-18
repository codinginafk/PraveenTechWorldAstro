# Contributing — SEO & Content

This repo powers [praveentechworld.com](https://www.praveentechworld.com) (Astro, deployed via Vercel from `main`).
Everyone except the owner must ship through pull requests — `main` is protected: PR + 1 approval + green CI required.

## How to ship a change

1. Create a branch, make your edits, open a PR against `main`.
2. CI must go green (`audit-and-build`: preflight audit + full site build). If red, read the log — usually a frontmatter or image error.
3. Owner approves and merges. Unresolved review threads block merging.
4. Every PR gets an automatic Vercel preview URL — check your changes there before requesting review. That is your staging; you do not need Vercel access.

## Publishing rules (CI enforces these — PR fails otherwise)

- New articles go in as `draft: true` under `src/content/articles/`. A scheduler publishes on cadence; do not flip drafts live yourself.
- Only ONE new article may go live at a time (Single-Post Release Guard). `Strict Single-Post Violation` in CI means you tripped it.
- Frontmatter is schema-validated (`src/content.config.ts`, `src/scripts/validate-content-frontmatter.mjs`): `author` is required, dates must be real, and the cover image file must exist in the repo (`lint-missing-images` fails otherwise).
- Slugs are permanent. Renaming one requires updating the redirect in ALL THREE places or you create chains/404s: `astro.config.mjs`, `vercel.json`, `public/_redirects`.

## Quality gate (required on every content PR)

- Run every new/edited article through `https://slopdetector.praveentechworld.com` (URL mode): combined score under 40, judge verdict NOT `likely_ai_raw`.
- Fix flagged phrases and re-run until it passes. Paste the score in your PR description.
- No filler for word count, no unsourced fake-precise stats, no `paradigm shift / deep dive / crucial / synergy` padding.

## Off-limits

- GSC Removals tool — never file a removal request without the owner. One bad request can deindex a money page for months.
- In-repo, do not touch: `vercel.json` redirect blocks, `research/agents/state.json` (automation state), `llms.txt` / `llms-full.txt` structure, `src/scripts/`, `.github/workflows/`.
- No Vercel / Cloudflare / credentials access is granted — and none is needed for SEO work.

Questions → ask before assuming.
