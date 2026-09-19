@echo off
title Hentikan Server SPP Imam Muzani
cd /d "%~dp0"

echo ====================================================
echo      HENTIKAN SERVER SPP IMAM MUZANI
echo ====================================================
echo.

echo [INFO] Mencari proses yang sedang berjalan di port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    echo [INFO] Menghentikan proses PID: %%a...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo [SELESAI] Server di port 5000 telah dihentikan.
echo.
pause
exit
