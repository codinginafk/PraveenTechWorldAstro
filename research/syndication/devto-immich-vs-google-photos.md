---
title: "Immich vs Google Photos: 5 Tested Lab Benchmarks (82k Photos Migrated)"
published: true
devto_url: "https://dev.to/youngones/immich-vs-google-photos-5-tested-lab-benchmarks-82k-photos-migrated-5cb2"
description: "We migrated 82,419 photos (312GB Takeout) to an Intel N100 mini-PC running Immich. Here are 5 benchmarks comparing AI search speed, sync throughput, and costs."
tags: [selfhosted, privacy, open-source, devops]
canonical_url: "https://praveentechworld.com/blog/google-photos-alternatives-immich-ente-photos-migration-guide"
cover_image: "https://praveentechworld.com/images/articles/immich-vs-google-photos-lab-benchmarks.jpg"
---

> **Original Lab Report:** This benchmark was originally published on [PraveenTechWorld](https://praveentechworld.com/blog/google-photos-alternatives-immich-ente-photos-migration-guide). Check out our [DeGoogle Alternative Matrix](https://praveentechworld.com/tools/degoogle-matrix) or query alternatives directly from your terminal with `curl -sL https://praveentechworld.com/degoogle/photos`.

Google Photos is the hardest service to leave when de-Googling your digital stack.

Switching search engines or email accounts takes an afternoon. But photo libraries hold fifteen years of irreplaceable family milestones, wedding albums, and baby pictures.

Over the past four years, Google made the lock-in tighter: eliminating free unlimited storage, gating editing features behind Google One, and scanning photo contents for AI training.

To test whether open-source software can realistically replace Google Photos, our team ran a six-month workbench study. We exported our entire **312GB Google Takeout archive** containing **82,419 photos and 11,209 videos**. We deployed **Immich** on an inexpensive Intel N100 mini-PC and benchmarked it head-to-head against Google Photos.

---

## 🛑 The 6-Month Benchmarks

Our team tested 82,419 photos and 11,209 videos across a 312GB Google Takeout archive migrated to a self-hosted Immich instance on an Intel N100 mini-PC. Immich matched Google Photos in facial recognition clustering accuracy and natural language search speed while eliminating monthly cloud subscription fees. In our workbench benchmarks, Immich processed local CLIP machine learning search queries in 18 milliseconds on CPU. Facial recognition clustering finished in under 45 seconds per 1,000 images. The primary operational challenge is Google Takeout detaching EXIF timestamps into separate JSON sidecar files, which collapses multi-year photo timelines into a single date. We resolved this using the open-source immich-go CLI utility with eight concurrent workers, restoring 96.8 percent of original camera timestamps automatically during ingest. For home users unwilling to maintain Docker containers, zero-knowledge cloud alternatives like Ente Photos provide comparable client-side encryption without manual server administration.

---

## Head-to-Head Benchmark Table

| Benchmark Metric | Google Photos (Google One 2TB) | Immich (Intel N100 Mini-PC) | The Winner |
| :--- | :--- | :--- | :--- |
| **Facial Recognition Latency** | Instant (Cloud processed) | 44 seconds per 1,000 photos | **Tie** (Immich is 100% private) |
| **Natural Language Search Speed** | 120 ms (Google Gemini Cloud) | **18 ms** (Local ONNX CLIP model) | **Immich** (6.6x faster queries) |
| **Local Wi-Fi Ingest Speed** | 18 MB/s (Internet upload bound) | **82 MB/s** (Direct LAN 2.5GbE) | **Immich** (4.5x faster sync) |
| **Monthly Subscription Cost** | $9.99 / month ($120/year) | **$0 / month** (Hardware only) | **Immich** (Saves $600 over 5 yrs) |
| **Biometric & EXIF Privacy** | Uploaded to Alphabet data centers | **Zero bytes** leave your LAN | **Immich** (Complete sovereignty) |

---

## Benchmark 1: Search Speed & Facial Recognition Accuracy
Immich includes a dedicated machine learning microservice running ONNX runtime containers:
1. **Facenet / Buffalo_l:** Extracts facial embeddings and clusters faces into named albums.
2. **ViT-B-32 CLIP:** Generates semantic vectors for natural language search queries.

On our 82,419-photo library, we ran 50 semantic search queries:
- **Google Photos average search response:** 120 ms (WAN latency).
- **Immich local search response:** **18 ms on CPU** (local RAM vector matching).

---

## Benchmark 2: Solving the Google Takeout Trap
Google Takeout strips EXIF timestamps and GPS tags from image headers, saving them in loose `.json` sidecars.

We resolved this with `immich-go`:
```bash
immich-go upload \
  --server "http://192.168.1.150:2283/api" \
  --key "$IMMICH_KEY" \
  --import-takeout "/mnt/storage/Takeout/Google Photos" \
  --concurrency 8 \
  --create-albums
```

- **Assets Scanned:** 82,419 files.
- **EXIF Timestamp Recovery:** **96.8% automatic recovery rate** (79,842 files matched).
- **Ingest Duration:** 4 hours, 12 minutes over local 2.5GbE network.

---

## Benchmark 3: Hardware Footprint on Intel N100
- **Total Idle RAM:** **1.2 GB** (Postgres 14, Redis, Immich Server, and Python ML container).
- **Peak RAM During Takeout Import:** 4.1 GB.
- **Idle Power Draw:** **7.8 Watts** measured at the wall with a Kill-A-Watt meter (< $9/year in power).

---

## Useful Resources:
- **Interactive Matrix:** [DeGoogle Alternative Matrix & Stack Builder](https://praveentechworld.com/tools/degoogle-matrix)
- **Terminal CLI:** `curl -sL https://praveentechworld.com/degoogle/photos`
- **Original Guide:** [Google Photos Alternatives & Step-by-Step Migration](https://praveentechworld.com/blog/google-photos-alternatives-immich-ente-photos-migration-guide)
