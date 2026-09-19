@echo off
title Hapus Auto-Start Aplikasi SPP Imam Muzani
cd /d "%~dp0"

echo ====================================================
echo  HAPUS AUTORUN APLIKASI SPP IMAM MUZANI
echo ====================================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\SPP-Imam-Muzani-Background.vbs"

if exist "%SHORTCUT_PATH%" (
    del /f /q "%SHORTCUT_PATH%" >nul
    echo [SUKSES] Auto-Start berhasil dihapus dari folder Startup Windows.
) else (
    echo [INFO] Auto-Start tidak ditemukan di folder Startup Windows.
)

echo.
pause
exit
