# Multi-Platform Distribution Pack: 0x800f0915 DISM Error: 3 Tested Fixes on Windows 11 (2026)
- **Canonical URL:** https://www.praveentechworld.com/blog/fix-dism-0x800f0915-efi-system-partition-too-small
- **DEV.to Tags:** windows, troubleshooting
- **DEV.to Body File:** [social_posts/fix-dism-0x800f0915-efi-system-partition-too-small-devto.md](fix-dism-0x800f0915-efi-system-partition-too-small-devto.md) (13040 chars)
- **Hero Image:** /images/articles/fix-dism-0x800f0915-efi-system-partition-too-small.jpg

---

## 1. LinkedIn Post
```text
Windows Update rolling back at 96% and spitting out DISM error 0x800f0915?

Here is maybe why your EFI partition is out of room and how I resolved the DISM error on my end.

Before reinstalling Windows, check two places: either the WinSxS store is missing delta manifests, or your hidden 100 MB EFI partition ran out of room to stage bootloader updates.

How we resolved this on the workbench is as follows:
1. Mounted a clean Windows 11 ISO and pointed DISM /RestoreHealth directly at install.wim
2. Mapped the hidden EFI partition with mountvol y: /s and cleared 40 MB of unused foreign boot fonts
3. Re-ran DISM component cleanup and sfc /scannow in order

What we tested on the workbench showed updates cleared 96% cleanly once the EFI volume had room again.

Have you hit this rollback loop on Windows 11 24H2 yet?

Full steps and exact commands are in the first comment below.

#windowsfixes #windowsrepair #windowsupdate #troubleshooting
```
**First Comment:** `Full steps and copy-paste commands are here: https://www.praveentechworld.com/blog/fix-dism-0x800f0915-efi-system-partition-too-small`

---

## 2. X (Twitter) 4-Tweet Thread
### Tweet 1 (raw: 197 / weighted: 197 chars)
```text
Hitting DISM error 0x800f0915 or Windows Update rollback at 96%? Here is maybe why your EFI System Partition is out of room and how to heal the CBS store.

What we tested on the workbench (thread):
```
### Tweet 2 (raw: 164 / weighted: 164 chars)
```text
1/ What broke:

Fix DISM error 0x800f0915 & update rollbacks.

Command:
dism /online /cleanup-image /restorehealth /source:WIM:D:\sources\install.wim:1 /limitaccess
```
### Tweet 3 (raw: 170 / weighted: 170 chars)
```text
2/ How we resolved this on the workbench:

• Run DISM and SFC in the Correct Order
• Automated PowerShell EFI Space Diagnostic
• Safely Purge Obsolete Boot Fonts and Logs
```
### Tweet 4 (raw: 159 / weighted: 94 chars)
```text
Full copy-paste runbook and benchmarks:

https://www.praveentechworld.com/blog/fix-dism-0x800f0915-efi-system-partition-too-small

#windowsfixes #windowsrepair
```
