# cbs-update-repair.ps1 - Production Toolkit 2026
# PraveenTechWorld Sysadmin Toolkit (https://www.praveentechworld.com)

Write-Host "🛠️ Executing Windows Update & Component Store Reset..." -ForegroundColor Cyan

# 1. Stop Services
Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue
Stop-Service -Name bits -Force -ErrorAction SilentlyContinue
Stop-Service -Name cryptsvc -Force -ErrorAction SilentlyContinue
Stop-Service -Name trustedinstaller -Force -ErrorAction SilentlyContinue

# 2. Rename folders
Rename-Item -Path "C:\Windows\SoftwareDistribution" -NewName "SoftwareDistribution.old" -Force -ErrorAction SilentlyContinue
Rename-Item -Path "C:\Windows\System32\catroot2" -NewName "catroot2.old" -Force -ErrorAction SilentlyContinue

# 3. Restart Services
Start-Service -Name cryptsvc
Start-Service -Name bits
Start-Service -Name wuauserv
Start-Service -Name trustedinstaller

# 4. Run DISM Cleanup
dism.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase
dism.exe /Online /Cleanup-Image /RestoreHealth
sfc /scannow

Write-Host "✅ Servicing store repair sequence completed!" -ForegroundColor Green
