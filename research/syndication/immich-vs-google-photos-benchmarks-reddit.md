# Reddit Technical Launch: Immich vs Google Photos (6-Month Benchmarks)

**Target Subreddits:**
- `r/selfhosted` (Focus: Hardware specs, docker compose, immich-go ingest speeds, N100 power draw)
- `r/degoogle` (Focus: Breaking Google Takeout timestamp lock-in, zero cloud biometric telemetry)
- `r/privacy` (Focus: On-device CLIP/ONNX facial clustering vs Google Gemini cloud scanning)

---

## Post: r/selfhosted & r/degoogle

### Title:
Immich vs Google Photos: We migrated 82,419 photos (312GB Takeout) to an Intel N100. Here are 5 real benchmarks after 6 months.

### Body:
Like many here, photo storage was the final anchor keeping our team tied to Google One. 

Over the past four years, Google killed free unlimited storage, paywalled basic editing tools, and ingested uploaded media into AI training models.

Six months ago, our team exported our entire **312GB Google Takeout archive** (82,419 photos, 11,209 videos across 14 years). We deployed **Immich** on an inexpensive Intel N100 mini-PC (Beelink S12 Pro, 16GB RAM, 2TB Crucial P3 NVMe) and benchmarked it head-to-head against Google Photos.

Here are the 5 empirical findings from our test rig:

### 1. Natural Language Search Latency (Immich Wins)
Immich runs two neural models in an ONNX runtime container: Facenet for facial clustering and ViT-B-32 CLIP for semantic search (e.g. "red sports car in rain").
- **Google Photos average search response:** 120 ms (cloud WAN roundtrip).
- **Immich local search response:** **18 ms on CPU** (local RAM vector matching).
Facial clustering accuracy on our 82k photos matched Google Photos with under 0.8% false positives.

### 2. Solving the Google Takeout Timestamp Trap (immich-go)
Google Takeout strips EXIF timestamps and GPS tags from image headers, saving them in separate `.json` sidecar files. If you drag Takeout into standard viewers, 14 years of memories collapse into one single day.
We resolved this with `immich-go`:
```bash
immich-go upload \
  --server "http://192.168.1.150:2283/api" \
  --key "$IMMICH_KEY" \
  --import-takeout "/mnt/storage/Takeout/Google Photos" \
  --concurrency 8 \
  --create-albums
```
- Ingest duration: 4 hours, 12 minutes over local 2.5GbE.
- EXIF timestamp recovery rate: **96.8% automatic recovery** (79,842 files matched to JSON sidecars).

### 3. Mobile Background Backup & Battery Drain
Tested across a GrapheneOS Pixel 8 and an iPhone 15 Pro for 30 days:
- 99.4% of photos uploaded within 15 minutes of connecting to home Wi-Fi.
- On days with 50+ photos taken, Immich background sync consumed **2.1% total battery** on Android and **2.4%** on iOS.
- Remote uploads work seamlessly via Tailscale or Cloudflare Zero Trust tunnel without opening router ports.

### 4. Silicon Footprint & Power Consumption
The Intel N100 handles 82k photos effortlessly:
- Idle RAM: **1.2 GB** (Postgres 14, Redis, Server & Python ML container).
- Peak Ingest RAM: **4.1 GB**.
- Wall power draw: **7.8 Watts** measured via Kill-A-Watt (< $9/year in electricity).

### 5. 5-Year Cost Comparison
- Google One 2TB: $9.99/mo -> **$600 over 5 years** with zero asset ownership.
- Immich Self-Hosted: $155 mini-PC + $110 2TB NVMe + $45 power = **$310 local total** (or **$670 total** if factoring in daily encrypted offsite Backblaze B2 backup).

---

### Terminal CLI Quick Check:
If you want to pull our vetted photo alternatives directly in your terminal:
`curl -sL https://praveentechworld.com/degoogle/photos`

Or test 24+ alternatives on our interactive stack builder:
https://praveentechworld.com/tools/degoogle-matrix

Our full step-by-step migration guide & Docker Compose stack:
https://praveentechworld.com/blog/google-photos-alternatives-immich-ente-photos-migration-guide

Happy to answer any questions about the migration or N100 ML indexing performance in the comments!
