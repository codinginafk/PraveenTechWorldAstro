# LinkedIn Post: Windows 11 24H2 Telemetry Workbench Audit

Toggling "Diagnostic Data" off in Windows 11 Settings is largely an illusion.

Our team deployed a clean install of Windows 11 24H2 (Build 26100) on an isolated physical VLAN.
We ran continuous Wireshark packet captures for seven full days (168 hours) with the machine completely idle.

The findings:
• Out of the box: 842 outbound background telemetry attempts per day.
• Settings toggled off (Basic level): Still 418 outbound connection attempts per day.
• Packets phoned home every 3.4 minutes across 38 unique Microsoft destination endpoints.

Why traditional fixes fail:
1. Standard Group Policy AllowTelemetry = 0 is silently overridden on Windows 11 Pro back to Basic.
2. Automated debloat scripts from GitHub often nuke DesktopAppInstaller and VCLibs, breaking Winget and Calculator.
3. The DiagTrack service and scheduled tasks (CompatTelRunner and DeviceCensus) continue pinging regardless of user interface settings.

Our 3-step technical mitigation framework:
1. Kill the telemetry pipeline: Disable DiagTrack and dmwappushservice via Administrator PowerShell.
2. Lock registry flags: Apply targeted DataCollection and CloudContent overrides to enforce Level 0 without triggering feedback loops.
3. Network-level sinkholing: Block the 38 verified FQDN endpoints (like vortex.data.microsoft.com) at your local DNS/Pi-hole while keeping Windows Update (ctldl) and Defender definitions unblocked.

We published our full 168-hour empirical report, raw packet capture CSV, and verified Pi-hole blocklist here:
https://www.praveentechworld.com/blog/windows-11-24h2-telemetry-network-fixes

How does your IT team currently handle Windows 11 24H2 diagnostic compliance?
