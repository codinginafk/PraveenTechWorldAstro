---
title: "Fixing NVIDIA nvlddmkm Event ID 153 GPU Crashes in Windows 11"
published: true
description: "A hardware-level engineering runbook to resolve nvlddmkm Event ID 153 crashes, PCIe power instability, and TDR timeouts."
tags: hardware, windows, nvidia, devops
canonical_url: "https://www.praveentechworld.com/blog/how-to-fix-nvlddmkm-event-id-153-gpu-crashes"
cover_image: "https://www.praveentechworld.com/images/generated/how-to-fix-nvlddmkm-event-id-153-gpu-crashes.jpg"
---

> 📢 *Originally published on [PraveenTechWorld](https://www.praveentechworld.com/blog/how-to-fix-nvlddmkm-event-id-153-gpu-crashes) with full TDR registry scripts and PCIe power diagnostic guides.*

When Windows displays a black screen or gaming/rendering applications crash to desktop with Event ID 153 in the System Event Log:
`\Device\Video3: Error occurred on GPUID: 100 (nvlddmkm)`

This indicates that the Windows Timeout Detection and Recovery (TDR) subsystem interrupted the NVIDIA kernel mode driver (`nvlddmkm.sys`) because a graphics engine command queue exceeded the default 2-second timeout.

---

## 🔍 Root Causes: Event ID 153 vs 13 / 14

- **Event ID 153:** Command buffer engine timeout (often caused by PCIe bus power drops, VRAM instability, or aggressive G-Sync polling).
- **Event ID 13 / 14:** Hard kernel hardware exceptions or memory page fault errors.

---

## 🛠️ Step 1: DDU Clean Driver Reinstallation in Safe Mode

Corrupted DirectX shader caches and overlapping driver components frequently cause micro-stutters that trigger TDR timeouts.
1. Download Display Driver Uninstaller (DDU).
2. Boot into Windows Safe Mode (`msconfig` $\rightarrow$ Boot $\rightarrow$ Safe Boot).
3. Run DDU and select **Clean and restart**.
4. Reinstall the latest WHQL driver with Clean Install checked.

---

## 🛠️ Step 2: Extend TDR Timeout Threshold via Registry

If transient micro-spikes trigger premature driver resets, extending `TdrDelay` from 2 seconds to 8 seconds provides sufficient runway for heavy compute jobs:

```powershell
$GraphicsKey = "HKLM:\System\CurrentControlSet\Control\GraphicsDrivers"
Set-ItemProperty -Path $GraphicsKey -Name "TdrDelay" -Value 8 -Type DWord -Force
Set-ItemProperty -Path $GraphicsKey -Name "TdrDdiDelay" -Value 8 -Type DWord -Force
```

---

## 🛠️ Step 3: Disable PCIe Native Power Management & ASPM

In NVIDIA Control Panel:
- Set **Power management mode** to `Prefer maximum performance`.
- In Windows Power Options, disable **Link State Power Management**.

For the complete hardware diagnostic runbook, FurMark stress testing protocols, and BIOS PCIe bifurcation checks, visit the full guide at [PraveenTechWorld](https://www.praveentechworld.com/blog/how-to-fix-nvlddmkm-event-id-153-gpu-crashes).
