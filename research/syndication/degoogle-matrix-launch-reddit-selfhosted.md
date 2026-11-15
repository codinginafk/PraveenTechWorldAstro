# Reddit Post for r/selfhosted

**Title:** We mapped 24+ self-hosted vs managed privacy tools into an interactive matrix + terminal CLI (Immich, Nextcloud, Syncthing, Vaultwarden benchmarks)

**Flair:** Self-Hosted Tool / Discussion

---

Hey r/selfhosted,

Whenever someone asks "How do I replace Google Drive and Photos on my home server?", the immediate answer is usually a wall of text: Nextcloud, Immich, Syncthing, Seafile, Vaultwarden.

The tricky part for newcomers (and even homelab veterans) is understanding the operational trade-offs:
- Which apps run smoothly on low-power Intel N100 mini-PCs?
- Which tools require true self-hosting vs zero-knowledge managed cloud when family members refuse to use a VPN?
- What are the real backup throughput numbers over local Wi-Fi?

Our team compiled our homelab benchmarks and test bench notes into an open interactive matrix and an 80-column terminal CLI.

### 🌐 The Interactive Matrix & Stack Builder
**URL:** https://www.praveentechworld.com/tools/degoogle-matrix

**Key Features:**
- **Self-Hosted Toggle:** Filter strictly for 100% self-hosted, Docker-deployable services (Immich, Nextcloud, Syncthing, Bitwarden/Vaultwarden, Aegis, GrapheneOS).
- **Architecture & Encryption Breakdowns:** Compare local at-rest encryption vs client-side E2EE.
- **Privacy Stack Builder:** Check off the services running in your homelab to calculate your Freedom Score (0-100%) and generate a live SVG badge for your GitHub profile README.

---

### 💻 Query Services Directly from Terminal (`curl` / `irm`)

If you are SSH'd into your home server or working in a terminal, you can pull comparisons directly via curl:

```bash
# Query photo backup alternatives (Docker Immich vs managed Ente):
curl -sL https://praveentechworld.com/degoogle/photos

# Query cloud storage & sync (Nextcloud vs Syncthing vs Proton Drive):
curl -sL https://praveentechworld.com/degoogle/storage

# Query email & calendar alternatives:
curl -sL https://praveentechworld.com/degoogle/email

# Complete 80-column cheatsheet table across all 16+ services:
curl -sL https://praveentechworld.com/degoogle/all

# Structured JSON for homelab automation or scripts:
curl -sL https://praveentechworld.com/degoogle/storage.json
```

*(On Windows, you can run `irm https://praveentechworld.com/degoogle/storage`)*

**Under the Hood:**
All CLI endpoints are statically pre-rendered at build time on Cloudflare Pages global CDN. Output is strict 80-column safe ASCII with zero ANSI control characters. Zero tracking, zero server runtime.

---

### 🖥️ Real Workbench Observations From Our Homelab

1. **Immich (Replacing Google Photos):**
   - Running in Docker Compose on an Intel N100 (16GB RAM).
   - Facial recognition and CLIP smart search run completely locally via machine learning containers.
   - Sync throughput over local 5GHz Wi-Fi easily saturates 70-80 MB/s when backing up 4K video clips and 48MP RAW photos.
   - **Verdict:** The single best self-hosted application in our entire stack.

2. **Syncthing (Replacing Google Drive Sync):**
   - Peer-to-peer mesh synchronization between Linux workstation, Windows dev machine, and Android phone.
   - Zero cloud relay needed when on the same LAN; pushes files direct over TLS at wire speed.
   - Does not require configuring reverse proxies or public domain DNS.

3. **Nextcloud Hub (Replacing Google Workspace & Docs):**
   - Ideal for collaborative office documents (with Nextcloud Office / Collabora) and contact/calendar CardDAV sync.
   - For simple file syncing without the PHP/Redis overhead, Syncthing is lighter, but Nextcloud is indispensable for team sharing.

4. **Vaultwarden (Replacing Google Password Manager):**
   - Rust implementation of Bitwarden backend.
   - Idles at under 25MB RAM on Docker. Automatic encrypted SQLite backups to local NAS.

---

### 💬 Community Input
What are your favorite self-hosted alternatives currently handling your digital sovereignty? We're actively expanding the matrix database.

- **Interactive Matrix:** https://www.praveentechworld.com/tools/degoogle-matrix
- **Full Runbook:** https://www.praveentechworld.com/blog/degoogle-starter-pack-complete-guide
- **Terminal CLI:** `curl -sL https://praveentechworld.com/degoogle/all`
