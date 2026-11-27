# Multi-Platform Distribution Pack: 0x800f0915 DISM Error: 3 Tested Fixes on Windows 11 (2026)
- **Canonical URL:** https://www.praveentechworld.com/blog/fix-dism-0x800f0915-efi-system-partition-too-small
- **DEV.to Tags:** windows, troubleshooting
- **DEV.to Body File:** [social_posts/fix-dism-0x800f0915-efi-system-partition-too-small-devto.md](fix-dism-0x800f0915-efi-system-partition-too-small-devto.md) (13040 chars)
- **Hero Image:** /images/articles/fix-dism-0x800f0915-efi-system-partition-too-small.jpg

---

## 1. LinkedIn Post
```text
Hitting DISM error 0x800f0915 or Windows Update rollback at 96%?

Here is why your EFI System Partition is out of room and how to heal the CBS store.

On our test bench running Windows 11 24H2, our team resolved DISM error 0x800f0915 (CBS_E_SOURCE_NOT_IN_LIST) by addressing two distinct bottlenecks: missing Component-Based Servicing manifests and low free storage on the EFI System Partition (ESP). First, repair the corrupted WinSxS component store from a mounted official ISO by executing dism /online /cleanup-image /restorehealth /source:WIM:D:\sources\install.wim:1 /limitaccess in an elevated PowerShell terminal.

What our team tested on the workbench:
1. Run DISM and SFC in the Correct Order
2. Automated PowerShell EFI Space Diagnostic
3. Safely Purge Obsolete Boot Fonts and Logs

Have you seen this exact fault on your Windows 11 or workbench setups?

Full step-by-step runbook and copy-paste commands in the first comment below.

#windowsfixes #windowsrepair #windowsupdate #troubleshooting
```
**First Comment:** `Full interactive runbook, benchmarks, and tested commands here: https://www.praveentechworld.com/blog/fix-dism-0x800f0915-efi-system-partition-too-small`

---

## 2. X (Twitter) 4-Tweet Thread
### Tweet 1 (raw: 197 / weighted: 197 chars)
```text
Hitting DISM error 0x800f0915 or Windows Update rollback at 96%? Here is why your EFI System Partition is out of room and how to heal the CBS store.

Here is what our workbench test found (thread):
```
### Tweet 2 (raw: 273 / weighted: 273 chars)
```text
1/ Root Cause & Scope:

On our test bench running Windows 11 24H2, our team resolved DISM error 0x800f0915 (CBS_E_SOURCE_NOT_IN_LIST) by addressing two distinct bottlenecks: missing Component-Based Servicing manifests and low free storage on the EFI System Partition (ESP).
```
### Tweet 3 (raw: 269 / weighted: 269 chars)
```text
2/ Tested fix steps on our bench:

• Run DISM and SFC in the Correct Order
• Automated PowerShell EFI Space Diagnostic
• Safely Purge Obsolete Boot Fonts and Logs

Key command:
dism /online /cleanup-image /restorehealth /source:WIM:D:\sources\install.wim:1 /limitaccess
```
### Tweet 4 (raw: 159 / weighted: 94 chars)
```text
Full copy-paste runbook and benchmarks:

https://www.praveentechworld.com/blog/fix-dism-0x800f0915-efi-system-partition-too-small

#windowsfixes #windowsrepair
```
