# Writer Memory & Style Guidelines (PraveenTechWorld)

## 1. Brand Voice & Perspective
- **First-Person Team Perspective:** Always write articles and technical guides from the first-person perspective of 'our team', 'my friends and I', or 'our workbench'. Share real, firsthand dev-ops workbench testing, failure cases, and real benchmarks.
- **The Veteran Voice:** Speak peer-to-peer. Assume the reader is smart but stressed. Lead with the architectural 'Why', then give the exact technical 'How'. Ban fluff words ('delve', 'robust', 'seamless', 'game-changer', 'revolutionize').
- **Battle Scars:** Mention what fails in production, not just what works in theory (e.g. VRAM allocations, CUDA out-of-memory errors, quantization quality degradation).

## 2. Technical SEO & Quality Gates (110/110 Criteria)
- **Direct Answer Snippet:** Every article must lead with a concise direct answer in the opening 60 words formatted inside a blockquote (> **Quick answer:** ...).
- **Heading Bold Leads:** Provide bold, direct answers immediately beneath every H2 subheading.
- **Metadata Limits:** Frontmatter description must strictly be $\le 165$ characters. 	itle must target the primary search intent.
- **Reproducible Artifacts:** Include working, tested code (PowerShell, Python, Bash, Docker Compose) and comprehensive benchmark comparison tables.
- **Single-Post Limit:** Exactly 1 article released/modified per session to ensure isolated Git history.

## 3. The Readability Standard
- **Sentence Length Target:** Keep average sentence length between 11 and 15 words. Never write a sentence longer than 25 words without breaking it with a period.
- **First-Person Workbench Experience:** Ground every technical guide in real developer work: "We tested this on Windows 11 24H2", "The script crashed on line 42 because Pandas read empty cells as strings".
- **Cut the Buzzwords:** Eliminate synergy, paradigm, transformative, testament, landscape, multifaceted, leverage, utilize.
- **Immediate Direct Answer:** Put the exact PowerShell/Python command or 2-sentence fix in the first 50 words before getting into the architecture.

## 4. Mandatory Priority Topics & Topical Purity
- **The 3 Allowed Focus Lanes:** 
  1. **DeGoogle, Privacy & Digital Sovereignty:** (GrapheneOS, Proton/Tuta, Nextcloud, SearXNG, telemetry blocking).
  2. **Windows Kernel & Hardware Troubleshooting:** (BSOD 0x1E/0x101/0x124, DISM 0x800f0915/0x8024200d, TDR nvlddmkm, RAM diagnostics).
  3. **Local & Self-Hosted AI DevOps:** (Ollama, DeepSeek local deployment, VRAM calculators, local RAG benchmarks).
- **Zero Dilution Rule:** Never draft or research generic AI summaries, speculative predictions, office productivity tips, student grade scripts, or generic social marketing guides.
- **Double Down on News/Cluster Winners:** All new articles or news coverage must anchor directly to existing winners (especially expanding the #1 ranking DeGoogle cluster).
