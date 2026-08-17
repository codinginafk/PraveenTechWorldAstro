<#
.SYNOPSIS
    DeepSeek Windows Server Log Triage Toolkit (2026 Edition)
    Automated Event Viewer & CBS diagnostic log analysis using DeepSeek V4 & local Ollama.

.DESCRIPTION
    Collects Windows System, Application, and Setup event logs, redacts internal PII
    (IPs, Active Directory SIDs, file paths), and sends sanitized logs to either
    DeepSeek V4 Cloud API or a local air-gapped Ollama instance for instant triage.

.PARAMETER LogName
    The Event Log to query (e.g., 'System', 'Application', 'Setup'). Default: 'System'.

.PARAMETER Hours
    How many past hours to inspect for Critical (1) and Error (2) events. Default: 2.

.PARAMETER Mode
    'cloud' to use DeepSeek V4 API, or 'local' to use on-premise Ollama. Default: 'cloud'.

.PARAMETER ApiKey
    DeepSeek API Key. If omitted, reads from $env:DEEPSEEK_API_KEY.

.EXAMPLE
    .\DeepSeek-LogTriage.ps1 -LogName "System" -Hours 2 -Mode "cloud"

.EXAMPLE
    .\DeepSeek-LogTriage.ps1 -LogName "Application" -Hours 4 -Mode "local"

.NOTES
    Author: PraveenTechWorld Engineering Team
    Documentation: https://www.praveentechworld.com/blog/deepseek-powershell-log-triage-windows-server
    License: MIT
#>

[CmdletBinding()]
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
    # 1. Redact RFC1918 Private IPv4 Addresses
    $Sanitized = $RawLogText -replace '\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})\b', '[INTERNAL_IP]'
    # 2. Redact Active Directory Domain User SIDs
    $Sanitized = $Sanitized -replace 'S-1-5-21-\d+-\d+-\d+-\d+', '[DOMAIN_USER_SID]'
    # 3. Normalize User Profiles
    $Sanitized = $Sanitized -replace 'C:\\Users\\[a-zA-Z0-9._-]+', 'C:\Users\[USER]'
    return $Sanitized
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "🔍 DeepSeek Windows Server Log Triage Toolkit" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Querying $LogName for Critical & Error events from past $Hours hours..." -ForegroundColor Gray

$Filter = @{
    LogName   = $LogName
    Level     = 1, 2
    StartTime = (Get-Date).AddHours(-$Hours)
}

$Events = Get-WinEvent -FilterHashtable $Filter -ErrorAction SilentlyContinue | Select-Object -First 15

if (-not $Events) {
    Write-Host "✅ Zero Critical or Error events detected in the specified timeframe." -ForegroundColor Green
    return
}

Write-Host "Found $($Events.Count) error events. Sanitizing telemetry..." -ForegroundColor Yellow

$LogSummary = $Events | ForEach-Object {
    [PSCustomObject]@{
        TimeCreated = $_.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss")
        Id          = $_.Id
        Provider    = $_.ProviderName
        Message     = ($_.Message -split "`n")[0..2] -join " "
    }
} | ConvertTo-Json -Compress

$CleanPayload = Sanitize-LogPayload -RawLogText $LogSummary
$SystemPrompt = "You are a Principal Windows Systems Infrastructure Engineer. Analyze these sanitized Windows Event Viewer logs. Provide: 1) Root Cause Summary, 2) Affected Subsystems, 3) Step-by-Step PowerShell Remediation Script."

if ($Mode -eq "cloud") {
    if (-not $ApiKey) {
        Write-Error "DeepSeek API Key is missing. Set `$env:DEEPSEEK_API_KEY or pass -ApiKey."
        return
    }
    Write-Host "Dispatching payload to DeepSeek V4 Cloud API..." -ForegroundColor Cyan
    $Headers = @{
        "Authorization" = "Bearer $ApiKey"
        "Content-Type"  = "application/json"
    }
    $Body = @{
        model       = "deepseek-v4-flash"
        messages    = @(
            @{ role = "system"; content = $SystemPrompt },
            @{ role = "user"; content = "Server Logs:`n$CleanPayload" }
        )
        temperature = 0.2
    } | ConvertTo-Json -Depth 5

    try {
        $Response = Invoke-RestMethod -Uri "https://api.deepseek.com/chat/completions" -Method Post -Headers $Headers -Body $Body
        Write-Host "`n=================================================================" -ForegroundColor Green
        Write-Host "📋 INCIDENT TRIAGE & REMEDIATION REPORT (DeepSeek V4 Cloud)" -ForegroundColor Green
        Write-Host "=================================================================" -ForegroundColor Green
        Write-Host $Response.choices[0].message.content
    } catch {
        Write-Error "API Request Failed: $($_.Exception.Message)"
    }
} else {
    Write-Host "Dispatching payload to Local Ollama (deepseek-r1:8b)..." -ForegroundColor Cyan
    $LocalBody = @{
        model  = "deepseek-r1:8b"
        prompt = "$SystemPrompt`n`nLogs:`n$CleanPayload"
        stream = $false
    } | ConvertTo-Json

    try {
        $Response = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body $LocalBody -ContentType "application/json"
        Write-Host "`n=================================================================" -ForegroundColor Green
        Write-Host "📋 INCIDENT TRIAGE & REMEDIATION REPORT (Local Ollama)" -ForegroundColor Green
        Write-Host "=================================================================" -ForegroundColor Green
        Write-Host $Response.response
    } catch {
        Write-Error "Local Ollama Request Failed. Ensure Ollama is running on port 11434: $($_.Exception.Message)"
    }
}
