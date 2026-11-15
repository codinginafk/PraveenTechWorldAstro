# Reddit Post for r/degoogle

**Title:** We built a zero-bloat interactive matrix and terminal CLI to audit & replace Google services (24+ tested tools, Freedom Score builder, and CLI curl endpoints)

**Flair:** Discussion / Guide / Resource

---

Hey r/degoogle,

Like many of you here, our team spent the last two years systematically migrating our daily workflows off Google. 

Most "DeGoogle" articles on Google Search are either outdated SEO spam or affiliate farm links pushing proprietary VPNs. We got tired of bookmarking fifteen different Reddit threads and GitHub repos just to recommend a clean setup to friends. 

So over the last month, we took all our test bench notes and compiled them into an open, zero-tracking web matrix and a terminal CLI.

### 🌐 The Interactive Matrix & Privacy Stack Builder
**Live Tool:** https://www.praveentechworld.com/tools/degoogle-matrix

What it does:
- **Filters 24+ vetted alternatives** across 8 core services (Photos, Email, Storage, Search, Mobile OS, Maps, Passwords, Office).
- **Multi-attribute filtering:** Filter instantly by `Self-Hosted`, `Zero-Knowledge E2EE`, `100% Free / FOSS`, or `No Account Required`.
- **Jurisdiction & Protocol audit:** See which tools sit outside 14-Eyes surveillance (e.g. Proton in Switzerland, Tuta in Germany, Organic Maps in Estonia) vs US cloud providers.
- **My Privacy Stack Builder:** Check off the tools you actually use to calculate your DeGoogle Freedom Score (0-100%) and generate a dynamic Markdown SVG badge for your GitHub profile README (`[![DeGoogle](https://img.shields.io/badge/...)]`).

---

### 💻 Query Alternatives Directly in Your Terminal (curl / PowerShell)
We wanted a fast, distraction-free way to look up replacement specs from a bash prompt without opening a heavy browser tab:

```bash
# General CLI guide & directory of topics
curl -sL https://praveentechworld.com/degoogle

# Alternatives to Google Photos (Immich, Ente Photos)
curl -sL https://praveentechworld.com/degoogle/photos

# Alternatives to Gmail (Proton Mail, Tuta)
curl -sL https://praveentechworld.com/degoogle/email

# Alternatives to Google Drive (Nextcloud, Syncthing, Proton Drive)
curl -sL https://praveentechworld.com/degoogle/storage

# Alternatives to Google Search & Chrome (Kagi, Brave, Mullvad Browser)
curl -sL https://praveentechworld.com/degoogle/search

# Full 80-column comparison cheatsheet table across all 16+ services
curl -sL https://praveentechworld.com/degoogle/all
```

*(On Windows PowerShell, you can use `irm https://praveentechworld.com/degoogle/photos`)*

**Security & Privacy Guarantee:**
The CLI endpoints are 100% statically pre-rendered at build time on Cloudflare Pages global edge cache. There is zero server-side runtime, no database queries, and no tracking cookies. Output is strict 80-column safe ASCII with zero dangerous terminal ANSI escape codes.

---

### 🛠️ Key Takeaways From Our Test Bench

Here is what actually survived on our personal hardware:

1. **Photo Backup (Google Photos -> Immich & Ente):**
   - **Immich** runs in Docker on our Intel N100 mini-PC. On-device machine learning does facial recognition locally with zero data leaving our home network. Backs up full RAW photos over local Wi-Fi twice as fast as Google Photos.
   - For family members who refuse to manage Docker, **Ente Photos** (Zero-Knowledge E2EE, France) is our default cloud recommendation.

2. **Mobile Operating System (Stock Android -> GrapheneOS):**
   - We ran Wireshark packet captures for 48 hours. Stock Android fired 348 background telemetry connections per hour to Google servers.
   - GrapheneOS with Sandboxed Google Play dropped background telemetry connections to zero. Banking apps and hardware NFC payments still work without root compromises.

3. **File Sync (Google Drive -> Syncthing & Nextcloud):**
   - Nextcloud replaces Google Docs and Drive for team collaboration.
   - For raw multi-device folder sync between Windows, Linux, and Android, **Syncthing** is peer-to-peer over local Wi-Fi at 80 MB/s with zero cloud intermediary.

4. **Search (Google Search -> Kagi & Brave):**
   - **Kagi** has permanently eliminated SEO spam and content farms for our daily development work.
   - **Brave Search** remains the best free independent index that does not syndicate Bing or Google.

---

### 💬 We'd Love Your Feedback
The matrix is completely free and requires zero login. What other tools or niche self-hosted alternatives are you running that we should add to the matrix and CLI database?

- **Interactive Tool:** https://www.praveentechworld.com/tools/degoogle-matrix
- **Full Runbook & Telemetry Audit:** https://www.praveentechworld.com/blog/degoogle-starter-pack-complete-guide
- **Terminal CLI:** `curl -sL https://praveentechworld.com/degoogle/all`
