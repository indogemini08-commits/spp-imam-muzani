@echo off
title Membuka Aplikasi SPP Imam Muzani
cd /d "%~dp0"

echo ====================================================
echo      APLIKASI KEUANGAN SPP IMAM MUZANI (LOCAL)
echo ====================================================
echo.

powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue) -ne $null" | findstr /i "true" >nul
if %ERRORLEVEL% equ 0 goto ALREADY_RUNNING

echo [INFO] Menyalakan server lokal di latar belakang...
wscript.exe "%~dp0scripts\start-silent.vbs"

echo [INFO] Menunggu server siap digunakan...
set /a ATTEMPTS=0

:WAIT_LOOP
ping 127.0.0.1 -n 2 >nul
set /a ATTEMPTS+=1
powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue) -ne $null" | findstr /i "true" >nul
if %ERRORLEVEL% equ 0 goto OPEN_BROWSER
if %ATTEMPTS% geq 10 goto OPEN_BROWSER
goto WAIT_LOOP

:ALREADY_RUNNING
echo [OK] Server lokal sudah berjalan aktif di port 5000.

:OPEN_BROWSER
echo.
echo [BERHASIL] Membuka aplikasi di peramban web...
start "" "http://localhost:5000"
ping 127.0.0.1 -n 2 >nul
exit /b 0
