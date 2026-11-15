# Reddit Post for r/privacy

**Title:** A technical threat-model directory and CLI tool for Google alternatives (E2EE verification, jurisdiction audits, and zero-telemetry terminal endpoints)

**Flair:** Resource / Tool / Discussion

---

Hey r/privacy,

When migrating off Alphabet's infrastructure, the hardest part is evaluating threat models. Many replacement lists slap "private" on apps that still store unencrypted metadata, log IP addresses, or operate inside 14-Eyes jurisdictions with gag orders.

Over the last several months, our team tested 24+ open-source and privacy-hardened alternatives against real threat models:
- **Zero-knowledge client-side encryption** vs server-side encryption
- **Jurisdictional protections** (Switzerland, EU GDPR, Sweden) vs US CLOUD Act subpoena reach
- **Hardware-level verification** (AOSP verified boot) vs proprietary Play Services privilege escalation

We compiled these findings into an open, interactive privacy matrix and an 80-column terminal CLI.

### 🌐 The Interactive Matrix & Stack Audit
**URL:** https://www.praveentechworld.com/tools/degoogle-matrix

**Core Capabilities:**
1. **Cryptographic Filtering:** Filter by `Zero-Knowledge E2EE`, `Local At-Rest`, or `Hardware Verified Boot`.
2. **Jurisdiction Map:** Clear breakdown of server locations and legal jurisdictions (France, Germany, Switzerland, Estonia, Sweden, Local).
3. **Registration Requirements:** Filter tools that require `No Account / Zero Phone Number` (e.g. CryptPad, Organic Maps, Syncthing) to prevent identity linkage.
4. **My Privacy Stack Builder:** Audit your own digital footprint, calculate your Freedom Score (0-100%), and generate a verifiable SVG badge for your GitHub README.

---

### 💻 Query Privacy Alternatives in Terminal (`curl` / `irm`)

For developers and sysadmins, we also deployed static terminal endpoints. You can query threat models and specs directly from your shell:

```bash
# Query threat model and vetted replacements for Google Photos:
curl -sL https://praveentechworld.com/degoogle/photos

# Query threat model and replacements for Gmail & Google Contacts:
curl -sL https://praveentechworld.com/degoogle/email

# Query password manager & 2FA seed security (Bitwarden vs Aegis):
curl -sL https://praveentechworld.com/degoogle/security

# Complete 80-column comparison cheatsheet:
curl -sL https://praveentechworld.com/degoogle/all

# Structured JSON output for scripts:
curl -sL https://praveentechworld.com/degoogle/photos.json
```

*(On Windows PowerShell, use `irm https://praveentechworld.com/degoogle/[topic]`)*

**Architecture & Zero-Telemetry Guarantee:**
To practice what we preach, the CLI endpoints are 100% pre-rendered at build time on Cloudflare Pages. There is no dynamic server runtime, no database, no session logging, and no analytics cookies on the text endpoints. Headers enforce `X-Content-Type-Options: nosniff` and `Content-Type: text/plain; charset=utf-8` with zero ANSI escape codes.

---

### 🛡️ Threat Model Breakdowns from Our Bench

1. **Email (Gmail -> Proton vs Tuta):**
   - **Threat:** Automated machine scanning of receipts, flight confirmations, and purchase history.
   - **Proton Mail:** Zero-access PGP storage under Swiss jurisdiction. Standard PGP leaves subject lines visible in transit between non-Proton recipients.
   - **Tuta Mail:** Uses custom post-quantum cryptography that encrypts subject lines, calendar events, and contact lists at rest and in transit.

2. **Photos (Google Photos -> Immich vs Ente):**
   - **Threat:** Facial recognition graphs, EXIF location clustering, and AI model ingestion.
   - **Immich:** 100% local self-hosting. Machine learning models run on your local CPU/GPU with zero external telemetry.
   - **Ente Photos:** Zero-knowledge client-side encryption using XChaCha20-Poly1305. Servers in France cannot read image content or EXIF metadata.

3. **2FA & Password Storage (Google Auth -> Aegis & Bitwarden):**
   - **Threat:** Google Authenticator cloud sync defaults to unencrypted account seeds tied to a single Google account.
   - **Aegis:** Android-native, FOSS 2FA vault encrypted with AES-256-GCM. Biometric unlock and local encrypted JSON exports.
   - **Bitwarden / Vaultwarden:** Zero-knowledge encrypted vault. Self-hostable on Docker in under 10 minutes.

---

### 💬 Discussion
We want to keep this matrix accurate, battle-tested, and up-to-date for 2026. 

Are there specific threat models, cryptographic implementations, or zero-knowledge tools you feel we should audit next?

- **Interactive Tool:** https://www.praveentechworld.com/tools/degoogle-matrix
- **Complete Runbook:** https://www.praveentechworld.com/blog/degoogle-starter-pack-complete-guide
- **Terminal CLI:** `curl -sL https://praveentechworld.com/degoogle/all`
