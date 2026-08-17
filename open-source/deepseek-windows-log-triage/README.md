# ⚡ DeepSeek Windows Server Log Triage Toolkit

[![PowerShell](https://img.shields.io/badge/PowerShell-5.1%20%7C%207%2B-blue.svg)](https://microsoft.com/powershell)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-V4%20API-darkgreen.svg)](https://deepseek.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Blog Guide](https://img.shields.io/badge/Guide-PraveenTechWorld-indigo.svg)](https://www.praveentechworld.com/blog/deepseek-powershell-log-triage-windows-server)

An automated PowerShell diagnostic pipeline powered by **DeepSeek V4** models (`deepseek-v4-flash`, `deepseek-v4-pro`) and on-premise **Ollama** (`deepseek-r1:8b`).

Diagnose Windows Event Viewer anomalies, CBS servicing errors (e.g. `0x8024200d`, `0x800f0922`), and IIS crash dumps in under 2 seconds.

> 📖 **Full Engineering Runbook, Benchmarks & Deep Dives:**  
> Read the complete architectural deep dive on [PraveenTechWorld](https://www.praveentechworld.com/blog/deepseek-powershell-log-triage-windows-server).

---

## 🌟 Key Features

- **Dual Execution Engine:**
  - **Cloud Mode:** Ultra-low latency analysis via DeepSeek V4 API (`deepseek-v4-flash`).
  - **Air-Gapped Local Mode:** 100% offline analysis via local Ollama (`deepseek-r1:8b`) for strict compliance environments.
- **Automated PII & Network Sanitization:**
  - Redacts RFC1918 private IPv4 subnets (`10.x.x.x`, `192.168.x.x`, `172.16.x.x`).
  - Strips Active Directory Domain User SIDs (`S-1-5-21-...`).
  - Masks absolute Windows user directory paths.
- **Actionable Remediation Output:**
  - Returns concise Root Cause, Impacted Subsystems, and immediate PowerShell copy-paste repair commands.

---

## 🚀 Quick Start

### 1. Cloud Mode (DeepSeek V4 API)
```powershell
# Set your API Key
$env:DEEPSEEK_API_KEY = "sk-xxxxxxxxxxxxxxxxxxxxxxxx"

# Triage System log errors from the last 2 hours
.\DeepSeek-LogTriage.ps1 -LogName "System" -Hours 2 -Mode "cloud"
```

### 2. Air-Gapped Mode (Local Ollama)
```powershell
# Ensure Ollama is running locally with DeepSeek-R1
# ollama run deepseek-r1:8b

# Triage Application errors from the last 4 hours offline
.\DeepSeek-LogTriage.ps1 -LogName "Application" -Hours 4 -Mode "local"
```

---

## 📊 Parameters

| Parameter | Type | Default | Description |
|:---|:---:|:---:|:---|
| `-LogName` | String | `System` | Target Windows Event Log (`System`, `Application`, `Setup`, `Security`) |
| `-Hours` | Int | `2` | Inspection lookback window in hours |
| `-Mode` | String | `cloud` | Engine selection: `cloud` (API) or `local` (Ollama) |
| `-ApiKey` | String | `$env:DEEPSEEK_API_KEY` | DeepSeek API authentication key |

---

## 🔒 Security & Privacy

Before any log data leaves the server, `Sanitize-LogPayload` executes regex redactions against:
1. Private IP ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
2. Windows Security Identifiers: `S-1-5-21-xxxxxxxxxx`.
3. User directory profiles: `C:\Users\<username>\...`.

---

## 📄 License & Attribution

Distributed under the **MIT License**. See `LICENSE` for more information.

Maintained by the engineering team at [PraveenTechWorld](https://www.praveentechworld.com).
