# X (Twitter) Thread: How to Find WiFi Password on Windows 11

1/4 Stop digging through 6 nested Settings menus when you need to recover a saved Wi-Fi password on Windows 11. 

Here is the 5-second terminal command to reveal the plaintext security key for any network your PC has ever joined:

`netsh wlan show profile name="SSID" key=clear`

2/4 Scroll down to "Security settings" and check "Key Content". 

The best part? This works even when your Wi-Fi is toggled off or disconnected from the network. Windows caches the encrypted profile locally and decrypts it on demand.

3/4 Need to audit all saved Wi-Fi networks on a laptop at once? Run this 1-line PowerShell dumper:

(netsh wlan show profiles) | Select-String "\:(.+)$" | % { $n=$_.Matches.Groups[1].Value.Trim(); $p=(netsh wlan show profile name="$n" key=clear) | Select-String "Key Content\W+\:(.+)$"; [PSCustomObject]@{SSID=$n; Password=($p.Matches.Groups[1].Value.Trim())} } | ft

4/4 We documented the complete Windows 11 24H2 runbook, bulk CSV exports, and why enterprise 802.1X/RADIUS networks show blank keys:

https://praveentechworld.com/blog/how-to-find-wifi-password-on-windows-11
