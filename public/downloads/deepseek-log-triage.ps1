# DeepSeek-LogTriage.ps1 - Production Toolkit 2026
# PraveenTechWorld Sysadmin Toolkit (https://www.praveentechworld.com)
param (
    [Parameter(Mandatory=$false)]
    [string]$LogName = "System",
    [Parameter(Mandatory=$false)]
    [int]$Hours = 2,
    [Parameter(Mandatory=$false)]
    [ValidateSet("cloud", "local")]
    [string]$Mode = "cloud",
    [Parameter(Mandatory=$false)]
    [string]$ApiKey = $env:DEEPSEEK_API_KEY
)

function Sanitize-LogPayload {
    param ([string]$RawLogText)
    $Sanitized = $RawLogText -replace '\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})\b', '[INTERNAL_IP]'
    $Sanitized = $Sanitized -replace 'S-1-5-21-\d+-\d+-\d+-\d+', '[DOMAIN_USER_SID]'
    $Sanitized = $Sanitized -replace 'C:\\Users\\[a-zA-Z0-9._-]+', 'C:\Users\[USER]'
    return $Sanitized
}

Write-Host "🔍 Querying $LogName for Critical & Error events from past $Hours hours..." -ForegroundColor Cyan
$Filter = @{ LogName = $LogName; Level = 1, 2; StartTime = (Get-Date).AddHours(-$Hours) }
$Events = Get-WinEvent -FilterHashtable $Filter -ErrorAction SilentlyContinue | Select-Object -First 15

if (-not $Events) {
    Write-Host "✅ Zero Critical or Error events detected." -ForegroundColor Green
    return
}

$LogSummary = $Events | ForEach-Object {
    [PSCustomObject]@{
        TimeCreated = $_.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss")
        Id          = $_.Id
        Provider    = $_.ProviderName
        Message     = ($_.Message -split "`n")[0..2] -join " "
    }
} | ConvertTo-Json -Compress

$CleanPayload = Sanitize-LogPayload -RawLogText $LogSummary
$SystemPrompt = "You are an elite Windows Systems Engineer. Return Root Cause, Affected Subsystems, and PowerShell Remediation."

if ($Mode -eq "cloud") {
    $Headers = @{ "Authorization" = "Bearer $ApiKey"; "Content-Type" = "application/json" }
    $Body = @{ model = "deepseek-v4-flash"; messages = @(@{ role = "system"; content = $SystemPrompt }, @{ role = "user"; content = "Server Logs:`n$CleanPayload" }); temperature = 0.2 } | ConvertTo-Json -Depth 5
    $Response = Invoke-RestMethod -Uri "https://api.deepseek.com/chat/completions" -Method Post -Headers $Headers -Body $Body
    Write-Host "`n=== INCIDENT TRIAGE REPORT ===" -ForegroundColor Green
    Write-Host $Response.choices[0].message.content
} else {
    $LocalBody = @{ model = "deepseek-r1:8b"; prompt = "$SystemPrompt`n`nLogs:`n$CleanPayload"; stream = $false } | ConvertTo-Json
    $Response = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body $LocalBody -ContentType "application/json"
    Write-Host "`n=== INCIDENT TRIAGE REPORT ===" -ForegroundColor Green
    Write-Host $Response.response
}
