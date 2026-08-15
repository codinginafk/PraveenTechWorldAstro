# nvlddmkm-tdr-patch.ps1 - Production Toolkit 2026
# PraveenTechWorld Sysadmin Toolkit (https://www.praveentechworld.com)

Write-Host "🛠️ Applying TdrDelay 8-second recovery key to Windows Graphics Subsystem..." -ForegroundColor Cyan

$GraphicsKey = "HKLM:\System\CurrentControlSet\Control\GraphicsDrivers"

if (Test-Path $GraphicsKey) {
    Set-ItemProperty -Path $GraphicsKey -Name "TdrDelay" -Value 8 -Type DWord -Force
    Set-ItemProperty -Path $GraphicsKey -Name "TdrDdiDelay" -Value 8 -Type DWord -Force
    Write-Host "✅ TdrDelay set to 8 seconds successfully!" -ForegroundColor Green
    Write-Host "Please restart your PC for kernel graphics settings to take effect." -ForegroundColor Yellow
} else {
    Write-Host "❌ GraphicsDrivers key not found." -ForegroundColor Red
}
