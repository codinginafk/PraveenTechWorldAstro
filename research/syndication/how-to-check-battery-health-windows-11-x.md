# X (Twitter) Thread: How to Check Battery Health on Windows 11

1/4 Why does your Windows 11 laptop die after 90 minutes when the battery icon says 100%?

Because Windows Settings only shows current charge level—not how much actual chemical capacity your cells have lost.

Here is how to check your real battery health in 5 seconds without installing third-party apps:

2/4 Open Windows Terminal or PowerShell and run:

`powercfg /batteryreport /output "$HOME\battery-report.html"`

Then run `Start-Process "$HOME\battery-report.html"` to open the diagnostic file.

3/4 Scroll down to "Installed Batteries". Look at two numbers:
- Design Capacity (factory spec)
- Full Charge Capacity (current actual max)

Calculate your health:
(Full Charge / Design Capacity) * 100

If your score is below 65%, your battery is heavily degraded.

4/4 Want the calculation printed right in your terminal without opening a browser?

Run this one-liner:
powercfg /batteryreport /output "$HOME\battery-report.html" | Out-Null; $h = Get-Content "$HOME\battery-report.html" -Raw; $d = [regex]::Match($h, 'DESIGN CAPACITY</span></td><td>([\d,]+)').Groups[1].Value -replace ',',''; $f = [regex]::Match($h, 'FULL CHARGE CAPACITY</span></td><td>([\d,]+)').Groups[1].Value -replace ',',''; [PSCustomObject]@{ 'Design Capacity (mWh)' = [int]$d; 'Full Charge (mWh)' = [int]$f; 'Health' = "{0:P1}" -f ([int]$f / [int]$d) }

Full runbook & lifespan extension tips:
https://praveentechworld.com/blog/how-to-check-battery-health-windows-11
