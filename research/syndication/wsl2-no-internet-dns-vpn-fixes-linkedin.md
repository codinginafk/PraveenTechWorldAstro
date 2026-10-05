# LinkedIn Syndication: WSL2 No Internet on Windows 11? DNS & VPN Fixes

WSL2 suddenly has no internet while Windows 11 browses normally? Before you overwrite `/etc/resolv.conf`, check what's actually failing.

On our engineering workbench, our developer workstations ran into this exact wall after upgrading to Windows 11 23H2/24H2: Windows browsed without issue, but `sudo apt update`, `docker pull`, or `git clone` stalled with `Temporary failure in name resolution` or hung on TLS handshakes.

The root cause isn't Linux—it's how Hyper-V's legacy virtual NAT switch (172.x.x.1) interacts with corporate VPNs (Cisco AnyConnect, GlobalProtect, Zscaler).

Here is our team's tested runbook:

1. Enable DNS Tunneling:
Open PowerShell: `notepad $env:USERPROFILE\.wslconfig`
Add:
```ini
[wsl2]
dnsTunneling=true
autoProxy=true
```
Then run: `wsl --shutdown`

This routes DNS queries directly through the Windows host virtualization socket rather than raw Hyper-V NAT packets.

2. Clamp MTU for Corporate VPNs:
If `ping 1.1.1.1` works but `apt update` or `git clone` hangs during TLS handshakes, your VPN encapsulation is dropping packets larger than 1400 bytes.
Inside WSL, run:
`sudo ip link set dev eth0 mtu 1400`

3. The resolv.conf Symlink Trap:
Never write nameservers directly into `/etc/resolv.conf` without setting `generateResolvConf=false` in `/etc/wsl.conf`—otherwise, WSL wipes your file on every restart.

We published our complete triage decision matrix, 5-second automated diagnostic PowerShell script, and companion config generator:

Read the full guide: https://praveentechworld.com/blog/wsl2-internet-not-working-windows-11-dns-vpn-fixes

#WSL2 #Windows11 #DevOps #Networking #Linux #Sysadmin #Troubleshooting
