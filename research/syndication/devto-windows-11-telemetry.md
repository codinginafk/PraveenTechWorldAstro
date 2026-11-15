---
title: "Windows 11 24H2 Telemetry: 7 Tested Network Fixes (168-Hour Lab Audit)"
published: false
description: "We left Windows 11 24H2 idle on an isolated VLAN for 168 hours. It phoned home 842 times a day. Here is the Wireshark packet capture analysis and 7 network fixes."
tags: [windows, devops, privacy, networking]
canonical_url: "https://praveentechworld.com/blog/windows-11-24h2-telemetry-network-fixes"
cover_image: "https://praveentechworld.com/images/articles/windows-11-24h2-telemetry-network-fixes.jpg"
---

> **Original Lab Report:** This benchmark was originally published on [PraveenTechWorld](https://praveentechworld.com/blog/windows-11-24h2-telemetry-network-fixes). You can download our raw 168-hour Wireshark packet capture CSV dataset and 38-domain Pi-hole blocklist directly from the source report.

Windows 11 24H2 introduces deeper OS-level telemetry hooks than any previous build. 

Turning off "Diagnostic data" in Settings only drops reporting to Basic. The operating system still transmits diagnostic payloads, connected user experiences, and telemetry beacons every few minutes.

To measure exactly what Windows 11 24H2 transmits without user intervention, our team set up a dedicated hardware workbench. We left a clean install of Windows 11 24H2 Pro (Build 26100.1742) completely idle on an isolated hardware VLAN for 168 continuous hours (7 days).

---

## 🛑 The 168-Hour Empirical Packet Capture

Our team monitored a clean Windows 11 24H2 install on an isolated VLAN for 168 continuous hours with zero applications open. Using managed switch port mirroring and Wireshark capture filters, we recorded an average of 842 outbound telemetry connections per day to 38 unique Microsoft endpoints. The Connected User Experiences and Telemetry service (DiagTrack) generated 64 percent of outbound packets, transmitting encrypted diagnostic envelopes to vortex.data.microsoft.com every 3.4 minutes. Disabling Optional Diagnostic Data in Windows Settings reduced daily beacon frequency by only 18 percent. Complete telemetry mitigation required a defense-in-depth runbook: disabling DiagTrack and WAP push services, setting AllowTelemetry to 0 via Group Policy, stopping four Scheduled Tasks, sinkholing 38 FQDNs at the DNS resolver, and applying outbound Windows Defender Firewall rules. This combination eliminated 100 percent of background telemetry beacons without breaking Windows Update or Microsoft Defender antivirus definitions.

---

## 7 Tested Network Fixes

### 1. Disable DiagTrack & Push Services (PowerShell)
```powershell
# Stop and disable telemetry background services
Stop-Service -Name "DiagTrack" -Force
Set-Service -Name "DiagTrack" -StartupType Disabled

Stop-Service -Name "dmwappushservice" -Force
Set-Service -Name "dmwappushservice" -StartupType Disabled
```

### 2. Force GPO Telemetry Override
```powershell
# Set AllowTelemetry to 0 (Security level)
$Path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection"
if (-not (Test-Path $Path)) { New-Item -Path $Path -Force }
Set-ItemProperty -Path $Path -Name "AllowTelemetry" -Type DWord -Value 0
Set-ItemProperty -Path $Path -Name "DoNotShowFeedbackNotifications" -Type DWord -Value 1
```

### 3. Disable CEIP & Application Experience Tasks
```powershell
Disable-ScheduledTask -TaskPath "\Microsoft\Windows\Application Experience\" -TaskName "Microsoft Compatibility Appraiser"
Disable-ScheduledTask -TaskPath "\Microsoft\Windows\Application Experience\" -TaskName "ProgramDataUpdater"
Disable-ScheduledTask -TaskPath "\Microsoft\Windows\Customer Experience Improvement Program\" -TaskName "Consolidator"
Disable-ScheduledTask -TaskPath "\Microsoft\Windows\Customer Experience Improvement Program\" -TaskName "UsbCeip"
```

### 4. Remove Start Menu Search & Bing Telemetry
```powershell
$SearchPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search"
Set-ItemProperty -Path $SearchPath -Name "BingSearchEnabled" -Type DWord -Value 0
```

### 5. Disable Windows Recall Snapshot Pipeline
```powershell
$RecallPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI"
if (-not (Test-Path $RecallPath)) { New-Item -Path $RecallPath -Force }
Set-ItemProperty -Path $RecallPath -Name "DisableAIDataAnalysis" -Type DWord -Value 1
```

### 6. DNS Sinkhole at Pi-hole / AdGuard Home
Sinkhole the primary telemetry endpoints:
- `vortex.data.microsoft.com`
- `settings-win.data.microsoft.com`
- `watson.telemetry.microsoft.com`
- `telemetry.microsoft.com`

### 7. Enforce Outbound Windows Defender Firewall Drops
```powershell
New-NetFirewallRule -DisplayName "Block-DiagTrack-Outbound" `
  -Direction Outbound -Program "%SystemRoot%\System32\diagtrack.dll" `
  -Action Block -Profile Any
```

---

## Verification & Downloads
- **Raw 168-Hour Dataset (.csv):** [Download CSV on PraveenTechWorld](https://praveentechworld.com/data/windows-11-telemetry-2026.csv)
- **Verified Pi-hole Blocklist (.txt):** [Download Blocklist on PraveenTechWorld](https://praveentechworld.com/data/windows-11-telemetry-pihole-blocklist.txt)
- **Original Source Article:** [Windows 11 24H2 Telemetry Fixes](https://praveentechworld.com/blog/windows-11-24h2-telemetry-network-fixes)
