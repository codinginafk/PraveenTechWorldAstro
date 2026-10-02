# LinkedIn Syndication: How to Check Battery Health on Windows 11

Ever wonder why your Windows 11 laptop suddenly dies after two hours, even though Windows says the battery is at 100%?

Here is the dirty secret: Windows Settings displays charge percentage, but it intentionally hides actual battery health and cell degradation.

You do not need to download third-party utilities or ad-riddled freeware to find out if your battery is dying.

Windows 11 already includes a built-in battery diagnostic engine. Here is the 10-second command our team uses on workbench laptops:

1. Press `Win + X` and launch Terminal.
2. Run this command:
   `powercfg /batteryreport /output "$HOME\battery-report.html"`
3. Run `Start-Process "$HOME\battery-report.html"` to open the report.

Scroll to **Installed Batteries** and compare:
- **Design Capacity:** What the factory built (e.g., 48,000 mWh).
- **Full Charge Capacity:** What your cells can physically hold today (e.g., 32,000 mWh).

To find your health percentage:
(Full Charge Capacity / Design Capacity) * 100

Want an instant terminal one-liner that calculates the percentage without opening a browser?

```powershell
powercfg /batteryreport /output "$HOME\battery-report.html" | Out-Null; $h = Get-Content "$HOME\battery-report.html" -Raw; $d = [regex]::Match($h, 'DESIGN CAPACITY</span></td><td>([\d,]+)').Groups[1].Value -replace ',',''; $f = [regex]::Match($h, 'FULL CHARGE CAPACITY</span></td><td>([\d,]+)').Groups[1].Value -replace ',',''; [PSCustomObject]@{ 'Design Capacity (mWh)' = [int]$d; 'Full Charge (mWh)' = [int]$f; 'Health' = "{0:P1}" -f ([int]$f / [int]$d) }
```

We documented the full runbook, cycle count thresholds, and when battery swelling becomes a fire hazard:

Read the complete guide: https://praveentechworld.com/blog/how-to-check-battery-health-windows-11

#Windows11 #Sysadmin #LaptopRepair #Hardware #TechTips #ITSupport #PowerShell
