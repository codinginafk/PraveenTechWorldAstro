# X (Twitter) Thread: WSL2 No Internet on Windows 11 Fixes

1/5 WSL2 has no internet while Windows 11 browses normally?

Don't delete your distro or paste random DNS IPs into /etc/resolv.conf.

Here is why Hyper-V networking breaks under VPNs and the 3 verified fixes from our workbench:

2/5 Issue 1: Corporate VPN drops DNS requests.
When Cisco AnyConnect or GlobalProtect runs, strict NRPT policies isolate host DNS. Hyper-V's NAT switch (172.x.x.1) cannot reach the tunnel.

Fix: In %USERPROFILE%\.wslconfig add:
[wsl2]
dnsTunneling=true
autoProxy=true

Then run `wsl --shutdown`.

3/5 Issue 2: Silent TLS handshake hang (MTU clipping).
If `ping 1.1.1.1` works but `apt update` or `git clone` hangs indefinitely, VPN encapsulation overhead is exceeding standard 1500 MTU limits.

Fix: Inside WSL, run:
`sudo ip link set dev eth0 mtu 1400`

4/5 Issue 3: The /etc/resolv.conf wipe trap.
WSL regenerates /etc/resolv.conf on every reboot. Manual edits disappear unless you add `generateResolvConf=false` under `[network]` in `/etc/wsl.conf`.

5/5 We put together a full triage decision matrix and a 5-second PowerShell health probe script:

https://praveentechworld.com/blog/wsl2-internet-not-working-windows-11-dns-vpn-fixes
