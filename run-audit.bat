@echo off
setlocal enabledelayedexpansion

set "SF_PATH=C:\Program Files (x86)\Screaming Frog SEO Spider\ScreamingFrogSEOSpiderCli.exe"
set "SITE_URL=http://127.0.0.1:3000"
set "OUTPUT_DIR=.\seo-reports"
set "BUILD_DIR=.\dist"

echo ========================================
echo  Screaming Frog 20.2 Headless Audit
echo ========================================

:: Step 1: Build the site
echo [1/4] Building site...
call npx astro build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed. Aborting.
    exit /b 1
)

:: Step 2: Create output directory if it doesn't exist
echo [2/4] Creating output directory...
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

:: Step 3: Start preview server in background
echo [3/4] Starting preview server on %SITE_URL%...
start /B node serve-static.cjs

:: Wait for server to be ready (poll until HTTP 200)
echo [3/4] Waiting for preview server to respond...
set "SERVER_READY="
for /l %%i in (1,1,30) do (
    timeout /t 1 /nobreak >nul
    for /f "delims=" %%a in ('curl.exe -s -o nul -w "%%{http_code}" http://localhost:3000/ 2^>nul') do (
        if "%%a"=="200" set "SERVER_READY=1"
    )
    if defined SERVER_READY (
        echo [3/4] Preview server ready after %%i seconds
        goto :CRAWL
    )
)
echo [ERROR] Preview server did not start within 30 seconds. Aborting.
exit /b 1

:CRAWL
:: Step 4: Run Screaming Frog headless
echo [4/4] Launching Screaming Frog crawl...
"%SF_PATH%" --crawl "%SITE_URL%" --headless --overwrite --output-folder "%OUTPUT_DIR%" --export-tabs "Response Codes:Client Error (4xx),Response Codes:Redirection (3xx),Response Codes:Server Error (5xx),Images:Missing Alt Text,Page Titles:Missing,Page Titles:Duplicate,Canonicals:Missing,Canonicals:Multiple"

:: Step 5: Cleanup
echo [4/4] Stopping preview server on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /f >nul 2>&1
)

echo ========================================
echo  Audit Complete. Data in %OUTPUT_DIR%
echo ========================================
endlocal
