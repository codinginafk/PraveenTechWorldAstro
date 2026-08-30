# SlideShare Deck: Windows BSOD Stop Codes — The One-Page Triage Cheatsheet

---

### Slide 1: Title Slide
- **Title:** Windows BSOD Stop Codes: The One-Page Triage Cheatsheet
- **Subtitle:** How Sysadmins & Engineers Rapidly Isolate Hardware vs. Driver vs. Servicing Faults
- **Presenter:** PraveenTechWorld Engineering Team (praveentechworld.com)
- **Speaker Notes:** Welcome to our practical workbench cheatsheet for debugging Windows blue screens without wasting hours on pointless OS reinstalls.

---

### Slide 2: The Core Rule of Kernel Triage
- **Title:** Stop Formatting SSDs: Windows Is Just the Messenger
- **Bullet 1:** Over 85% of repeated BSODs survive clean Windows 11 reinstalls.
- **Bullet 2:** Silicon voltage droop, BIOS microcode tables, and driver hooks exist below the OS filesystem.
- **Bullet 3:** Always check `WinDbg` minidumps first (`!analyze -v`) before swapping physical hardware.
- **Bullet 4:** Isolate whether the crash is deterministic (single module) or systemic (random cores/threads).
- **Speaker Notes:** If a blue screen returns 15 minutes after a fresh Windows install, the problem is in firmware, power delivery, or low-level filter drivers.

---

### Slide 3: Stop Code 0x101 (CLOCK_WATCHDOG_TIMEOUT)
- **Title:** 0x101: Inter-Processor Clock Deadlock
- **Bullet 1:** **Mechanism:** A logical CPU core stops acknowledging inter-processor clock interrupts (IPI).
- **Bullet 2:** **Triage:** Check `BUGCHECK_P4` in WinDbg to find the exact deadlocked physical core index.
- **Bullet 3:** **Primary Cause:** Unstable undervolt offsets, VCORE load-line droop, or unpatched BIOS microcode (Intel 0x12B / AMD AGESA 1.2.0.2).
- **Bullet 4:** **Fix:** Load Optimized Defaults, disable Curve Optimizer, and flash latest UEFI microcode.
- **Speaker Notes:** 0x101 is almost always a hardware voltage or CPU microcode starvation issue rather than corrupted Windows system files.

---

### Slide 4: Stop Code 0x1E (KMODE_EXCEPTION_NOT_HANDLED)
- **Title:** 0x1E: Filter Driver Stack Collision
- **Bullet 1:** **Mechanism:** Kernel program code generated an exception that the default error handler did not trap.
- **Bullet 2:** **Common Culprit:** Third-party storage/audio/antivirus filter drivers clashing with Windows servicing updates (e.g. KB5089573).
- **Bullet 3:** **Triage:** Query active filter drivers using `fltmc filters` in elevated PowerShell.
- **Bullet 4:** **Fix:** Update colliding OEM filter drivers or apply corrective out-of-band updates (KB5094126).
- **Speaker Notes:** When KMODE crashes occur right after monthly updates, use fltmc to identify which third-party filter driver is intercepting I/O calls.

---

### Slide 5: Stop Code 0x3B / 0x50 (KB5121003 & inpoutx64.sys)
- **Title:** 0x3B / 0x50: HVCI Memory Paging Block
- **Bullet 1:** **Mechanism:** Legacy direct port I/O drivers (`inpoutx64.sys`) attempt unmapped port reads blocked by Windows 11 HVCI.
- **Bullet 2:** **Common Host Apps:** Outdated RGB software (Aura Sync, old OpenRGB), NZXT CAM plugins, and anti-cheat hooks.
- **Bullet 3:** **Triage:** Enumerate kernel services with `Get-CimInstance Win32_SystemDriver`.
- **Bullet 4:** **Fix:** Unload and delete kernel service via `sc stop inpoutx64` -> `sc delete inpoutx64` and delete driver binary.
- **Speaker Notes:** The August 2026 update strictly enforces hypervisor memory integrity, making legacy direct I/O drivers an instant crash vector.

---

### Slide 6: Stop Code 0x116 / 0x141 (Video TDR Failure)
- **Title:** Video TDR & nvlddmkm.sys Paging Timeout
- **Bullet 1:** **Mechanism:** GPU fails to respond to the Windows display watchdog within the default 2-second timeout window.
- **Bullet 2:** **Event 153:** Indicates an I/O paging queue deadlock between VRAM and system pagefile across the PCIe bus.
- **Bullet 3:** **Fix 1:** Clean DDU driver purge executed strictly inside Windows Safe Mode.
- **Bullet 4:** **Fix 2:** Increase `TdrDelay` & `TdrDdiDelay` to 8 seconds in registry, disable HAGS, and lock PCIe link to Gen 4 in BIOS.
- **Speaker Notes:** Event 153 is an I/O paging bottleneck across PCIe lanes, not a dead GPU core. Extending TdrDelay resolves transient compute shader stalls.

---

### Slide 7: The Rapid 5-Step Triage Matrix
- **Title:** The Workbench Triage Sequence
- **Bullet 1:** **Step 1 — Dump Analysis:** Inspect parameter registers in WinDbg (`!analyze -v`).
- **Bullet 2:** **Step 2 — Firmware Baseline:** Reset BIOS to factory defaults and flash latest microcode.
- **Bullet 3:** **Step 3 — Driver Cleanse:** Wipe display/chipset drivers with DDU / PnPUtil in Safe Mode.
- **Bullet 4:** **Step 4 — Servicing Check:** Run `DISM /RestoreHealth` and `sfc /scannow`.
- **Bullet 5:** **Step 5 — Hardware Stress:** Isolate RAM with MemTest86 / TestMem5 before swapping components.
- **Speaker Notes:** Always follow this systematic order to isolate the failure layer from silicon to software before purchasing replacement hardware.

---

### Slide 8: Conclusion & Resource Hub
- **Title:** Learn More at PraveenTechWorld
- **Bullet 1:** Read full, first-person verified IT diagnostic runbooks at **praveentechworld.com**.
- **Bullet 2:** Access PowerShell diagnostic automation tools and hardware teardowns.
- **Bullet 3:** Follow along for weekly developer operations, AI local benchmarks, and enterprise sysadmin guides.
- **Speaker Notes:** Thank you for reviewing our cheatsheet. Explore the complete interactive runbooks on PraveenTechWorld.com.
