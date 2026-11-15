# X (Twitter) Developer Thread: Windows 11 24H2 Telemetry Audit

## Tweet 1 (The Hook & Empirical Finding)
We left a clean Windows 11 24H2 install completely idle on an isolated VLAN for 168 hours (7 days).

No apps open. No web browsers running.

It phoned home 842 times a day to 38 Microsoft endpoints.

Here is what the raw Wireshark packet capture revealed—and 7 tested fixes to drop it to zero: 🧵

---

## Tweet 2 (The Settings Illusion)
The biggest myth: "Just turn off Diagnostic Data in Settings."

We tested it. Turning off Optional diagnostics only drops reporting to Level 1 (Basic).

It still transmits 418 outbound requests every 24 hours. The DiagTrack service pings Microsoft every 3.4 minutes.

---

## Tweet 3 (The GPO Trap on Windows 11 Pro)
Setting Group Policy `AllowTelemetry` to 0 in gpedit.msc is silently ignored on Windows 11 Pro.

The kernel forces it back to Basic unless you apply targeted registry locks:
- Stop `DiagTrack` & `dmwappushservice`
- Set `DoNotShowFeedbackNotifications = 1`
- Disable CEIP scheduled tasks

---

## Tweet 4 (The 7-Step Runbook)
Our lab runbook that kills telemetry without breaking Windows Update or Defender:

1. Stop DiagTrack service
2. GPO AllowTelemetry = 0 registry override
3. Disable CompatTelRunner scheduled tasks
4. Kill Start Menu Bing suggestions
5. Block Recall & Copilot background hooks
6. Pi-hole DNS sinkhole (38 FQDNs)
7. Defender outbound firewall blocks

---

## Tweet 5 (Downloads & Community Verification)
We believe in reproducible technical research.

Download our raw 168-hour CSV dataset and Pi-hole blocklist:

Article: https://www.praveentechworld.com/blog/windows-11-24h2-telemetry-network-fixes
Blocklist: https://www.praveentechworld.com/data/windows-11-telemetry-pihole-blocklist.txt
Raw CSV: https://www.praveentechworld.com/data/windows-11-telemetry-2026.csv
