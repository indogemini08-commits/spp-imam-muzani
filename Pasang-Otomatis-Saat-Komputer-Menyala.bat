@echo off
title Pasang Auto-Start Aplikasi SPP Imam Muzani
cd /d "%~dp0"

echo ====================================================
echo  PASANG AUTORUN APLIKASI SPP IMAM MUZANI
echo  (Server otomatis aktif saat komputer dinyalakan)
echo ====================================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\SPP-Imam-Muzani-Background.vbs"

copy /y "%~dp0scripts\start-silent.vbs" "%SHORTCUT_PATH%" >nul

if %ERRORLEVEL% equ 0 (
    echo [SUKSES] Auto-Start berhasil dipasang!
    echo.
    echo Lokasi: %SHORTCUT_PATH%
    echo.
    echo Sekarang setiap kali komputer atau laptop Anda dinyalakan / login,
    echo server SPP Imam Muzani akan otomatis berjalan hening di latar belakang.
    echo Anda tidak perlu membuka terminal atau menjalankan localhost lagi secara manual!
    echo.
) else (
    echo [GAGAL] Tidak dapat menyalin berkas ke folder Startup.
)

echo.
pause
exit
