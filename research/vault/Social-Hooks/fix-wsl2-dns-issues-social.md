# Social Syndication Hooks: Fix WSL2 DNS Issues & No Internet on Windows 11

## 𝕏 / Twitter Post (Technical Triage Hook)

`Temporary failure in name resolution` inside WSL2 on Windows 11?

Before wiping `/etc/resolv.conf`, check this: if your Windows host browses the web but Ubuntu stalls on `apt update` or `docker pull`, you likely hit one of two traps:

1. **The Corporate VPN Trap:** VPNs enforce strict split-tunnel NRPT routing that Hyper-V's NAT switch cannot access. Fix: Add `dnsTunneling=true` and `autoProxy=true` under `[wsl2]` in `%UserProfile%\.wslconfig` and run `wsl --shutdown`.
2. **The MTU Black Hole:** `ping 1.1.1.1` passes, but TLS handshakes stall on port 443? VPN encapsulation adds packet overhead. Run `sudo ip link set dev eth0 mtu 1400` to clamp the virtual interface.

Full architecture diagram & automated PowerShell diagnostic:
🔗 https://www.praveentechworld.com/blog/wsl2-internet-not-working-windows-11-dns-vpn-fixes

#WSL2 #Windows11 #DevOps #SysAdmin #LinuxOnWindows #Docker

---

## LinkedIn Post (Engineering Runbook)

Does your engineering fleet regularly battle "WSL2 has no internet" tickets after connecting to corporate VPNs?

The symptom is familiar: Windows 11 browses websites smoothly, but inside Ubuntu or Debian, running `git clone`, `docker pull`, or `sudo apt update` either hangs indefinitely or fails with:
`Temporary failure in name resolution`.

On our developer workbench at PraveenTechWorld, we stress-tested WSL2 across enterprise VPN profiles (Cisco AnyConnect, Palo Alto GlobalProtect, Zscaler). Here is why the network stack breaks and how to permanently harden it:

### 1. The Hyper-V Switch vs. NRPT Split-Tunneling
WSL2 runs inside a lightweight Hyper-V virtual machine connected via an internal virtual switch (`vEthernet (WSL)`). When a corporate VPN connects, it rewrites host routing tables with strict Name Resolution Policy Tables (NRPT) that do not route guest Hyper-V packets.

### 2. The Microsoft Supported Fix: DNS Tunneling
Instead of manually editing `/etc/resolv.conf` (which gets overwritten on every reboot anyway), enable native DNS tunneling in `%UserProfile%\.wslconfig`:
```ini
[wsl2]
dnsTunneling=true
autoProxy=true
```
This forces guest DNS queries to use the Windows host resolver directly, effortlessly traversing enterprise VPNs.

### 3. The MTU Clipping Trap
If IP pings succeed but HTTPS handshakes freeze, VPN tunneling overhead is exceeding standard 1500-byte MTU thresholds. Clamping the virtual interface (`sudo ip link set dev eth0 mtu 1400`) stops silent packet drops instantly.

We published our complete network stack architecture diagram, 6-point failure matrix, and automated PowerShell health diagnostic script:

👉 https://www.praveentechworld.com/blog/wsl2-internet-not-working-windows-11-dns-vpn-fixes

How does your team manage WSL2 network policies across your developer fleet?
