@echo off
REM ============================================================
REM  SightGuide - Phone Camera Launcher
REM  Phone browsers ONLY allow camera access on HTTPS or
REM  localhost. Opening http://192.168.x.x:3000 will NEVER show
REM  your phone camera. This script starts the app and creates
REM  a trusted HTTPS tunnel URL you open on your phone instead.
REM ============================================================
cd /d "%~dp0"
echo.
echo Starting SightGuide server on port 3000...
start "SightGuide Server" /min node server.js
timeout /t 2 >nul
echo.
echo Creating secure HTTPS tunnel (cloudflared)...
echo When a https://*.trycloudflare.com URL appears below,
echo open THAT url on your phone browser, tap Get Started,
echo then Allow Camera and accept the camera permission.
echo Keep this window open while testing. Press Ctrl+C to stop.
echo.
cloudflared tunnel --url http://localhost:3000
pause
