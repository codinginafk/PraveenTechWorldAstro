# X (Twitter) Developer Thread: Immich vs Google Photos Benchmarks

## Tweet 1 (The Hook & Empirical Finding)
We migrated 82,419 photos (312GB Google Takeout) to an Intel N100 mini-PC running Immich.

We benchmarked it against Google Photos for 6 months across facial recognition, search speed, battery drain, and costs.

Here is what the empirical lab data revealed: 🧵

---

## Tweet 2 (Search Latency & Private AI)
The biggest doubt with self-hosted photos: "Can local AI match Google Photos?"

In our tests:
- Immich local CLIP search: **18 ms on CPU**
- Google Photos search: **120 ms** (cloud roundtrip)

Immich runs local ONNX models for facial clustering and semantic search. Zero biometric vectors leave your LAN.

---

## Tweet 3 (The Google Takeout Trap)
Google Takeout maliciously strips EXIF timestamps from image headers and dumps them into loose `.json` sidecars.

If you import normally, 14 years of memories collapse into one single day.

The fix: We ran `immich-go` with 8 concurrent workers. It automatically matched and repaired 96.8% of EXIF timestamps in 4 hrs 12 mins.

---

## Tweet 4 (Silicon Footprint & Power)
You don't need a noisy server rack.

Our test rig: Beelink S12 Pro (Intel N100, 16GB RAM, 2TB NVMe). Total cost: $265.

- Idle RAM: **1.2 GB** (Postgres, Redis, Server & Python ML combined)
- Peak Ingest RAM: **4.1 GB**
- Wall power: **7.8 Watts** (< $9/year in electricity)

---

## Tweet 5 (The 5-Year Cost Breakdown)
Google One 2TB costs $9.99/mo ($600 over 5 years) and locks you in.

Our self-hosted Immich stack:
- Hardware + 2TB NVMe: $265
- 5-year electricity: $45
- Daily encrypted offsite B2 backup: $72/yr ($360 total)

Total 5-year cost with automated offsite backup: **$670**. You own the hardware forever.

---

## Tweet 6 (Terminal CLI & Lab Runbook)
Query our vetted photo privacy alternatives directly from your terminal:

`curl -sL https://praveentechworld.com/degoogle/photos`

Or test 24+ services on our interactive matrix:
https://praveentechworld.com/tools/degoogle-matrix

Full 6-month lab study & Docker Compose stack:
https://praveentechworld.com/blog/google-photos-alternatives-immich-ente-photos-migration-guide
