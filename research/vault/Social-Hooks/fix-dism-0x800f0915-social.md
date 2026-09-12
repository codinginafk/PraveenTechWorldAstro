# Social Syndication Hooks: Fix DISM Error 0x800f0915 on Windows 11

## 𝕏 / Twitter Post (Technical Triage Hook)

Is DISM throwing error `0x800f0915` or Windows Update rolling back at 96%?

Most techs waste hours running `sfc /scannow` in loops. But 0x800f0915 is almost always caused by one of two specific bottlenecks:

1. **The Order of Operations Mistake:** SFC relies on the WinSxS store as its golden reference. If WinSxS is corrupt, SFC fails. Always run DISM `/RestoreHealth` FIRST, SFC second.
2. **The EFI Partition Staging Trap:** Cumulative updates require 100–150MB of contiguous free space in the hidden EFI System Partition (ESP) for bootloader binaries and Secure Boot DBX lists. If your OEM disk has a cramped 100MB ESP, it hits `0x80070070` (ERROR_DISK_FULL).

Quick fix: Run `mountvol y: /s` and clear redundant multilingual fonts in `Y:\EFI\Microsoft\Boot\Fonts\` to recover 30–50MB instantly.

Full recovery runbook & automated PowerShell diagnostic:
🔗 https://www.praveentechworld.com/blog/fix-dism-0x800f0915-efi-system-partition-too-small

#Windows11 #SysAdmin #ITOps #WindowsUpdate #TechTroubleshooting

---

## LinkedIn Post (Engineering Runbook)

Has your team experienced the dreaded Windows Update rollback at 96%?

You initiate a scheduled cumulative update cycle on Windows 11 client workstations. The machine reboots, reaches 96%, and abruptly aborts with: *"Something went wrong. Undoing changes made to your computer."*

When you open PowerShell and run `dism /Online /Cleanup-Image /RestoreHealth`, it crashes with:
`Error: 0x800f0915 — CBS_E_SOURCE_NOT_IN_LIST`.

On our systems maintenance workbench at PraveenTechWorld, we reproduced and dissected this exact servicing failure. Here is what is happening under the hood:

### 1. Dual Bottleneck Architecture
Servicing updates must stage two components simultaneously:
- Delta payloads into the WinSxS component store.
- Updated boot manager binaries (`bootmgfw.efi`) and Secure Boot revocation lists (DBX) into the hidden EFI System Partition (ESP).

### 2. The Hidden Disk Full Fault (`0x80070070`)
Many enterprise and pre-built OEM machines configure the ESP at a legacy 100 MB capacity. Over years of updates and multilingual boot font accumulation (`Y:\EFI\Microsoft\Boot\Fonts`), available space drops below 15 MB. When the servicing stack tries to stage boot binaries, the volume runs out of room, triggering an instantaneous rollback.

### 3. Safe Recovery Protocol
- **Step 1:** Mount the hidden partition via `mountvol y: /s`.
- **Step 2:** Safely purge obsolete multilingual fonts (`del Y:\EFI\Microsoft\Boot\Fonts\* /q`) to recover 25–40 MB of headroom.
- **Step 3:** Mount clean ISO media and run offline DISM repair with `/LimitAccess` to heal the WinSxS store without contacting failed WSUS endpoints.

We published our complete architecture breakdown, step-by-step partition resizing protocol, and an automated PowerShell health diagnostic script:

👉 https://www.praveentechworld.com/blog/fix-dism-0x800f0915-efi-system-partition-too-small

How does your IT team monitor EFI partition overhead across your Windows endpoints?
