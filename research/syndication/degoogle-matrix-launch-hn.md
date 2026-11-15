# Hacker News (Show HN) Post

**Title:** Show HN: Query DeGoogle alternatives directly from curl (praveentechworld.com/degoogle/all)

**URL:** https://www.praveentechworld.com/tools/degoogle-matrix (or text post)

---

### Text Submission:

Hey HN,

A few months ago our team set out to systematically eliminate Google services from our daily engineering and personal workflows (photos, email, file sync, mobile OS, search, password management).

When looking for recommendations, most online lists are affiliate SEO content farms pushing proprietary VPNs or outdated software. We also wanted a way to look up replacement specs and threat models directly from a terminal without opening a browser tab while provisioning machines or servers.

So we compiled our test bench notes into an interactive matrix and an 80-column terminal CLI.

### Quick Terminal Usage

```bash
# Query replacements for Google Photos (Immich, Ente Photos)
curl -sL https://praveentechworld.com/degoogle/photos

# Query replacements for Google Drive & Sync (Nextcloud, Syncthing, Proton Drive)
curl -sL https://praveentechworld.com/degoogle/storage

# Query replacements for Gmail & Calendar (Proton Mail, Tuta)
curl -sL https://praveentechworld.com/degoogle/email

# Full 80-column cheatsheet table across all 16+ services
curl -sL https://praveentechworld.com/degoogle/all

# Structured JSON for scripts
curl -sL https://praveentechworld.com/degoogle/photos.json
```

*(On Windows PowerShell, `irm https://praveentechworld.com/degoogle/photos` works out of the box).*

### Architecture & Security Details

1. **Static CDN Edge Pre-Rendering:** Because our site uses Astro in static mode (`output: "static"`), every route compiles to static text/JSON files on Cloudflare Pages. There is no Node.js or Python runtime executing on an origin server, no database, and no server-side RCE or command injection vector.
2. **Terminal Safety:** Text output contains strictly printable ASCII and safe box characters. Zero ANSI escape sequences are emitted, eliminating terminal emulator escape injection vulnerabilities.
3. **80-Column Standard:** Every line outside of bare clickable URLs is wrapped to <= 80 characters so it fits standard 80x24 terminal windows without awkward line wrapping.
4. **Headers:** Hardened with `Content-Type: text/plain; charset=utf-8`, `X-Content-Type-Options: nosniff`, `Access-Control-Allow-Origin: *`, and edge caching headers.

### The Interactive Web Matrix

For visual filtering, we also put up an interactive tool:
https://www.praveentechworld.com/tools/degoogle-matrix

- Filter by: Self-Hosted, Zero-Knowledge E2EE, FOSS, or No Account Required.
- Jurisdiction audit (Switzerland, Germany, France, Estonia vs US).
- "My Privacy Stack" builder: Computes your Freedom Score (0-100%) and generates a Markdown badge for your GitHub profile README (`[![DeGoogle](https://img.shields.io/badge/...)]`).

Full 48-hour packet capture telemetry report on stock Android vs GrapheneOS:
https://www.praveentechworld.com/blog/degoogle-starter-pack-complete-guide

The matrix is completely free and requires zero signup. We'd love feedback on any niche self-hosted tools or architectural trade-offs we missed.
