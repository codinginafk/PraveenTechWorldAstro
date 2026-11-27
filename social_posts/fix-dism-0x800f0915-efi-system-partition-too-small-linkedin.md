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
