@echo off
setlocal enabledelayedexpansion

set "SF_PATH=C:\Program Files (x86)\Screaming Frog SEO Spider\ScreamingFrogSEOSpiderCli.exe"
set "SITE_URL=http://localhost:3000"
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
start /B npx astro preview --port 3000
timeout /t 5 /nobreak >nul

:: Step 4: Run Screaming Frog headless
echo [4/4] Launching Screaming Frog crawl...
"%SF_PATH%" --crawl "%SITE_URL%" --headless --overwrite --output-folder "%OUTPUT_DIR%" --export-tabs "Response Codes:Client Error (4xx),Images:Missing Alt Text,Page Titles:Missing,Canonicals:Missing"

:: Step 5: Cleanup
echo [4/4] Stopping preview server...
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq node.exe" /fo list ^| findstr "PID:"') do (
    taskkill /PID %%a /f >nul 2>&1
)

echo ========================================
echo  Audit Complete. Data in %OUTPUT_DIR%
echo ========================================
endlocal
